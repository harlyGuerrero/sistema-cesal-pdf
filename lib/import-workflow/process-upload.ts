import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { computeHash, validateUpload } from "@/lib/security/pdf-validation";
import { DocumentServiceError, processDocument } from "@/lib/document-service/client";
import { normalizeProductCandidate } from "@/lib/normalization/normalize";
import { classifyRelevance } from "@/lib/classification/relevance";
import { classifyCategory, HIGH_CONFIDENCE_THRESHOLD } from "@/lib/classification/category";
import { buildActivoRows } from "./activo-creation";

// Orquesta el flujo completo (Fase 8): Upload -> validación -> hash ->
// duplicate check -> crear Import -> PROCESSING -> Document Service ->
// normalization -> relevance -> classification -> crear ImportItems ->
// READY_FOR_REVIEW. Este módulo es el único lugar del proyecto que llama a
// las etapas de Extraction/Normalization/Relevance/Classification en
// secuencia — cada una sigue viviendo en su propio módulo (ver CLAUDE.md
// regla 2), esto solo las orquesta y persiste el resultado.
//
// Regla de revisión (Fase 9): confidence alta -> CONFIRMED, si no ->
// REVIEW_REQUIRED. "Alta" acá significa específicamente method === "RULE"
// (siempre 0.85, por encima del umbral) — un resultado de OLLAMA nunca
// auto-confirma, sin importar su confidence autorreportada, por el problema
// de calibración medido y documentado en skill ollama (Fase 7). Los ítems
// auto-confirmados quedan con reviewedAt=null (nadie los revisó); los que
// confirma/rechaza un humano desde /importaciones/[id] sí llevan reviewedAt.

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

    // Si nada quedó pendiente de revisión (todo se auto-confirmó o se ignoró),
    // el Import pasa directo a COMPLETED — READY_FOR_REVIEW existe para
    // avisar que hay trabajo humano pendiente, no como parada obligatoria
    // (ver skill import-workflow).
    const hasPendingReview = itemsToCreate.items.some((item) => item.status === "REVIEW_REQUIRED");
    const finalStatus = hasPendingReview ? "READY_FOR_REVIEW" : "COMPLETED";
    const now = new Date();

    // Los ImportItem se crean primero (need sus ids) y recién con esos ids
    // se arman los Activo de los que quedaron auto-confirmados — un Activo
    // referencia su ImportItem de origen, no al revés (ver activo-creation.ts).
    await prisma.$transaction(async (tx) => {
      const createdItems =
        itemsToCreate.items.length > 0
          ? await tx.importItem.createManyAndReturn({ data: itemsToCreate.items })
          : [];

      const activoRows: Prisma.ActivoCreateManyInput[] = [];
      for (const item of createdItems) {
        if (item.status !== "CONFIRMED" || !item.tipoActivoId) continue;
        const rows = await buildActivoRows(tx, {
          importItemId: item.id,
          tipoActivoId: item.tipoActivoId,
          nombreActivo: item.normalizedName ?? item.rawText,
          quantity: item.quantity !== null ? Number(item.quantity) : null,
          unitPrice: item.unitPrice !== null ? Number(item.unitPrice) : null,
        });
        activoRows.push(...rows);
      }
      if (activoRows.length > 0) {
        await tx.activo.createMany({ data: activoRows });
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
        },
      });
    });

    return { outcome: "processed", importId: importRecord.id, itemCount: itemsToCreate.items.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.import.update({
      where: { id: importRecord.id },
      data: { status: "FAILED", errorMessage: message, processedAt: new Date() },
    });
    return { outcome: "failed", importId: importRecord.id, error: message };
  }
}

async function extractAndClassify(
  importId: string,
  file: UploadedFile
): Promise<{ items: Prisma.ImportItemCreateManyInput[]; ollamaUsedCount: number }> {
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

    let status: "IGNORED" | "CONFIRMED" | "REVIEW_REQUIRED";

    if (relevanceResult.relevance !== "PRODUCT") {
      status = "IGNORED";
    } else if (
      tipoActivoId &&
      categoryMethod === "RULE" &&
      categoryConfidence !== null &&
      categoryConfidence >= HIGH_CONFIDENCE_THRESHOLD
    ) {
      // El Activo correspondiente se crea después, en processUpload, una vez
      // que este ImportItem exista y tenga id (ver activo-creation.ts).
      status = "CONFIRMED";
    } else {
      status = "REVIEW_REQUIRED";
    }

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
      relevance: relevanceResult.relevance,
      relevanceMethod: relevanceResult.method,
      relevanceConfidence: relevanceResult.confidence,
      tipoActivoId,
      categoryMethod,
      categoryConfidence,
      status,
    });
  }

  return { items, ollamaUsedCount };
}
