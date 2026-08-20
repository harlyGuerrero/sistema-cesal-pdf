import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { computeHash, validateUpload } from "@/lib/security/pdf-validation";
import { DocumentServiceError, processDocument } from "@/lib/document-service/client";
import { normalizeProductCandidate } from "@/lib/normalization/normalize";
import { classifyRelevance } from "@/lib/classification/relevance";
import { classifyCategory } from "@/lib/classification/category";
import { crearNotificacionBroadcast } from "@/lib/notificaciones/crear";

// Orquesta el flujo completo (Fase 8): Upload -> validación -> hash ->
// duplicate check -> crear Import -> PROCESSING -> Document Service ->
// normalization -> relevance -> classification -> crear ImportItems ->
// READY_FOR_REVIEW. Este módulo es el único lugar del proyecto que llama a
// las etapas de Extraction/Normalization/Relevance/Classification en
// secuencia — cada una sigue viviendo en su propio módulo (ver CLAUDE.md
// regla 2), esto solo las orquesta y persiste el resultado.
//
// Fase 39: la confirmación siempre es manual, sin excepción — antes un ítem
// con clasificación por regla y confidence alta se auto-confirmaba (creaba
// su Activo sin que nadie lo revisara). Eso quedó eliminado a pedido
// explícito: todo activo detectado pasa por /importaciones/[id] y un humano
// lo confirma o rechaza. classifyCategory sigue corriendo igual — su
// resultado (tipoActivoId/method/confidence) precarga el formulario de
// revisión, solo que ya no decide el status por sí solo. Único status que
// sigue siendo automático: IGNORED, cuando la relevancia ni siquiera es
// PRODUCT (no es algo que revisar).

export interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export type ProcessUploadResult =
  | { outcome: "duplicate"; importId: string }
  | { outcome: "processed"; importId: string; itemCount: number }
  | { outcome: "failed"; importId: string; error: string };

export async function processUpload(file: UploadedFile): Promise<ProcessUploadResult> {
  // Puede lanzar PdfValidationError — lo maneja el route handler.
  validateUpload(file.filename, file.mimeType, file.buffer);

  const fileHash = computeHash(file.buffer);

  const existing = await prisma.import.findUnique({ where: { fileHash } });
  if (existing) {
    // No se reprocesa un PDF ya importado (ver skill import-workflow / Fase 8).
    return { outcome: "duplicate", importId: existing.id };
  }

  const importRecord = await prisma.import.create({
    data: {
      fileName: file.filename,
      fileHash,
      fileSize: file.buffer.length,
      mimeType: file.mimeType,
      status: "PROCESSING",
    },
  });

  try {
    const itemsToCreate = await extractAndClassify(importRecord.id, file);

    // Ya nada se auto-confirma (Fase 39) — solo IGNORED no necesita revisión.
    // Si hay al menos un ítem PRODUCT, queda READY_FOR_REVIEW; si todo fue
    // IGNORED (o no se detectó ningún ítem), pasa directo a COMPLETED.
    const reviewCount = itemsToCreate.items.filter((item) => item.status === "REVIEW_REQUIRED").length;
    const hasPendingReview = reviewCount > 0;
    const finalStatus = hasPendingReview ? "READY_FOR_REVIEW" : "COMPLETED";
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      if (itemsToCreate.items.length > 0) {
        await tx.importItem.createMany({ data: itemsToCreate.items });
      }

      if (itemsToCreate.ollamaUsedCount > 0) {
        await tx.processingAttempt.create({
          data: {
            importId: importRecord.id,
            engine: "OLLAMA",
            status: "COMPLETED",
            completedAt: now,
            metadata: { itemsClassifiedByOllama: itemsToCreate.ollamaUsedCount },
          },
        });
      }

      await tx.import.update({
        where: { id: importRecord.id },
        data: {
          status: finalStatus,
          processedAt: now,
          completedAt: finalStatus === "COMPLETED" ? now : null,
          // N° de factura: ya no se pide al subir el PDF (ver
          // upload-import-dialog.tsx) — se detecta del propio documento
          // (ver document-service/app/extraction/invoice_number.py). Mejor
          // esfuerzo: queda editable a mano en /importaciones/[id] si la
          // detección falla o no aplica (numero-factura-editor.tsx).
          numeroFactura: itemsToCreate.invoiceNumber,
        },
      });

      // Fase 49: sin requireSessionUsuario en este flujo (POST /api/imports
      // no queda atado a un actor, ver skill import-workflow) — se avisa a
      // todos los usuarios activos, no se puede excluir a "quien subió".
      if (finalStatus === "COMPLETED") {
        await crearNotificacionBroadcast(
          {
            tipo: "IMPORTACION_COMPLETADA",
            prioridad: "NORMAL",
            titulo: "Importación completada",
            mensaje: `La importación de "${file.filename}" se completó correctamente.`,
            entidad: "Import",
            entidadId: importRecord.id,
          },
          tx
        );
      } else {
        await crearNotificacionBroadcast(
          {
            tipo: "IMPORTACION_CON_ERRORES",
            prioridad: "ALTA",
            titulo: "Importación con pendientes",
            mensaje: `La importación de "${file.filename}" tiene ${reviewCount} registro(s) pendiente(s) de revisión.`,
            entidad: "Import",
            entidadId: importRecord.id,
          },
          tx
        );
      }
    });

    return { outcome: "processed", importId: importRecord.id, itemCount: itemsToCreate.items.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.import.update({
      where: { id: importRecord.id },
      data: { status: "FAILED", errorMessage: message, processedAt: new Date() },
    });
    await crearNotificacionBroadcast({
      tipo: "IMPORTACION_CON_ERRORES",
      prioridad: "ALTA",
      titulo: "Importación con pendientes",
      mensaje: `La importación de "${file.filename}" falló: ${message}`,
      entidad: "Import",
      entidadId: importRecord.id,
    });
    return { outcome: "failed", importId: importRecord.id, error: message };
  }
}

async function extractAndClassify(
  importId: string,
  file: UploadedFile
): Promise<{
  items: Prisma.ImportItemCreateManyInput[];
  ollamaUsedCount: number;
  invoiceNumber: string | null;
}> {
  const attemptStartedAt = new Date();
  let docResult;
  try {
    docResult = await processDocument(file.buffer, file.filename, file.mimeType);
  } catch (error) {
    await prisma.processingAttempt.create({
      data: {
        importId,
        engine: "DOCLING",
        status: "FAILED",
        startedAt: attemptStartedAt,
        completedAt: new Date(),
        durationMs: Date.now() - attemptStartedAt.getTime(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    throw error instanceof DocumentServiceError ? error : new DocumentServiceError(String(error));
  }

  await prisma.processingAttempt.create({
    data: {
      importId,
      engine: "DOCLING",
      status: "COMPLETED",
      startedAt: attemptStartedAt,
      completedAt: new Date(),
      durationMs: Date.now() - attemptStartedAt.getTime(),
      metadata: { pages: docResult.document.pages, tables: docResult.tables.length },
    },
  });

  const tiposActivo = await prisma.tipoActivo.findMany();
  const tipoActivoIdByCode = new Map(tiposActivo.map((tipo) => [tipo.code, tipo.id]));

  const items: Prisma.ImportItemCreateManyInput[] = [];
  let ollamaUsedCount = 0;

  for (const candidate of docResult.products) {
    const normalized = normalizeProductCandidate(candidate);
    const relevanceResult = classifyRelevance(normalized);

    let tipoActivoId: string | null = null;
    let categoryMethod: "RULE" | "OLLAMA" | null = null;
    let categoryConfidence: number | null = null;

    // Solo PRODUCT avanza a clasificación patrimonial (ver ARCHITECTURE.md 5.1).
    if (relevanceResult.relevance === "PRODUCT") {
      const categoryResult = await classifyCategory(normalized);
      if (categoryResult) {
        tipoActivoId = tipoActivoIdByCode.get(categoryResult.value) ?? null;
        categoryMethod = categoryResult.method;
        categoryConfidence = categoryResult.confidence;
        if (categoryResult.method === "OLLAMA") ollamaUsedCount += 1;
      }
    }

    // Fase 39: confirmación siempre manual — cualquier PRODUCT, sin importar
    // qué tan alta sea la confianza de la regla, espera revisión humana en
    // /importaciones/[id] (ver confirmItemAction/editAndConfirmItemAction).
    const status: "IGNORED" | "REVIEW_REQUIRED" = relevanceResult.relevance !== "PRODUCT" ? "IGNORED" : "REVIEW_REQUIRED";

    items.push({
      importId,
      rawText: normalized.rawText,
      sourcePage: normalized.source.page,
      sourceTable: normalized.source.table,
      sourceRow: normalized.source.row,
      normalizedName: normalized.normalizedName,
      quantity: normalized.normalizedQuantity,
      unitPrice: normalized.normalizedUnitPrice,
      totalPrice: normalized.normalizedTotalPrice,
      currency: normalized.normalizedCurrency,
      extractionConfidence: normalized.confidence,
      relevance: relevanceResult.relevance,
      relevanceMethod: relevanceResult.method,
      relevanceConfidence: relevanceResult.confidence,
      tipoActivoId,
      categoryMethod,
      categoryConfidence,
      status,
    });
  }

  return { items, ollamaUsedCount, invoiceNumber: docResult.document.invoiceNumber };
}
