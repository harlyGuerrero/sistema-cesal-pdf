"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { validateDocumentUpload, DocumentValidationError } from "@/lib/security/document-validation";
import { guardarDocumento } from "@/lib/documentos/storage";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { crearNotificacionBroadcast } from "@/lib/notificaciones/crear";
import { requireSessionUsuario } from "@/lib/auth/session";
import type { TipoDocumento } from "@/lib/generated/prisma/client";

// Fase 10 de Activos: subir/eliminar documentos adjuntos a un Activo. El
// archivo se valida igual que un PDF de Importaciones (MIME, extensión,
// tamaño, firma — ver lib/security/document-validation.ts) antes de tocar
// disco.

export async function subirDocumentoAction(activoId: string, formData: FormData): Promise<void> {
  const actor = await requireSessionUsuario();
  const file = formData.get("file");
  const tipoDocumento = formData.get("tipoDocumento") as TipoDocumento;
  const descripcion = (formData.get("descripcion") as string | null)?.trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona un archivo.");
  }
  if (!tipoDocumento) {
    throw new Error("Selecciona el tipo de documento.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let tipoArchivo;
  try {
    tipoArchivo = validateDocumentUpload(file.name, file.type, buffer);
  } catch (error) {
    if (error instanceof DocumentValidationError) throw new Error(error.message);
    throw error;
  }

  const extension = tipoArchivo.extensions[0];
  const nombreArchivo = await guardarDocumento(activoId, extension, buffer);

  await prisma.$transaction(async (tx) => {
    const documento = await tx.documento.create({
      data: {
        activoId,
        usuarioCargaId: actor.id,
        tipoDocumento,
        nombre: file.name,
        nombreOriginal: file.name,
        url: nombreArchivo,
        mimeType: tipoArchivo.mimeType,
        extension,
        tamanoBytes: buffer.length,
        descripcion,
      },
      include: { activo: { select: { nombreActivo: true, codigoPatrimonial: true } } },
    });
    await registrarAuditoria(
      {
        accion: "ADJUNTAR_DOCUMENTO",
        entidad: "Documento",
        entidadId: documento.id,
        detalle: {
          activoId,
          activoNombre: documento.activo.nombreActivo,
          codigoPatrimonial: documento.activo.codigoPatrimonial,
          tipoDocumento,
          nombreOriginal: file.name,
        },
        usuarioId: actor.id,
      },
      tx
    );
    await crearNotificacionBroadcast(
      {
        tipo: "DOCUMENTO_AGREGADO",
        prioridad: "INFORMATIVA",
        titulo: "Documento agregado",
        mensaje: `Se agregó un documento a "${documento.activo.nombreActivo}" (${documento.activo.codigoPatrimonial}).`,
        entidad: "Activo",
        entidadId: activoId,
        excluirUsuarioId: actor.id,
      },
      tx
    );
  });

  revalidatePath(`/activos/${activoId}`);
  revalidatePath(`/activos/${activoId}/ficha`);
}

export async function eliminarDocumentoAction(documentoId: string): Promise<void> {
  const actor = await requireSessionUsuario();
  const documento = await prisma.$transaction(async (tx) => {
    const updated = await tx.documento.update({
      where: { id: documentoId },
      data: { estado: false },
      include: { activo: { select: { nombreActivo: true, codigoPatrimonial: true } } },
    });
    await registrarAuditoria(
      {
        accion: "ELIMINAR_DOCUMENTO",
        entidad: "Documento",
        entidadId: documentoId,
        detalle: {
          activoId: updated.activoId,
          activoNombre: updated.activo.nombreActivo,
          codigoPatrimonial: updated.activo.codigoPatrimonial,
          nombreOriginal: updated.nombreOriginal,
        },
        usuarioId: actor.id,
      },
      tx
    );
    return updated;
  });

  revalidatePath(`/activos/${documento.activoId}`);
  revalidatePath(`/activos/${documento.activoId}/ficha`);
}
