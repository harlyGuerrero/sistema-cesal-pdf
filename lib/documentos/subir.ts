import { prisma } from "@/lib/db";
import { validateDocumentUpload, DocumentValidationError } from "@/lib/security/document-validation";
import { guardarDocumento } from "@/lib/documentos/storage";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { crearNotificacionBroadcast } from "@/lib/notificaciones/crear";
import { TIPO_DOCUMENTO_OPTIONS } from "@/lib/activos/labels";
import type { TipoDocumento } from "@/lib/generated/prisma/client";

// Error con mensaje apto para mostrarle al usuario (validación del archivo o
// de los campos); cualquier otro error es interno.
export class SubidaDocumentoError extends Error {}

// Fase 10 de Activos: el archivo se valida igual que un PDF de Importaciones
// (MIME, extensión, tamaño, firma — ver lib/security/document-validation.ts)
// antes de tocar disco. Fase 63: sale del server action a una función propia
// para que la use la API route de subida (app/api/activos/[id]/documentos),
// que puede informar el progreso y no tiene el límite de 1 MB de los server
// actions.
export async function subirDocumento({
  activoId,
  usuarioId,
  file,
  tipoDocumento,
  descripcion,
}: {
  activoId: string;
  usuarioId: string;
  file: File;
  tipoDocumento: string;
  descripcion: string | null;
}): Promise<{ id: string }> {
  if (file.size === 0) {
    throw new SubidaDocumentoError("Selecciona un archivo.");
  }
  if (!TIPO_DOCUMENTO_OPTIONS.some((option) => option.value === tipoDocumento)) {
    throw new SubidaDocumentoError("Selecciona el tipo de documento.");
  }

  const activo = await prisma.activo.findUnique({
    where: { id: activoId },
    select: { nombreActivo: true, codigoPatrimonial: true },
  });
  if (!activo) {
    throw new SubidaDocumentoError("El activo no existe.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let tipoArchivo;
  try {
    tipoArchivo = validateDocumentUpload(file.name, file.type, buffer);
  } catch (error) {
    if (error instanceof DocumentValidationError) throw new SubidaDocumentoError(error.message);
    throw error;
  }

  const extension = tipoArchivo.extensions[0];
  const nombreArchivo = await guardarDocumento(activoId, extension, buffer);

  return prisma.$transaction(async (tx) => {
    const documento = await tx.documento.create({
      data: {
        activoId,
        usuarioCargaId: usuarioId,
        tipoDocumento: tipoDocumento as TipoDocumento,
        nombre: file.name,
        nombreOriginal: file.name,
        url: nombreArchivo,
        mimeType: tipoArchivo.mimeType,
        extension,
        tamanoBytes: buffer.length,
        descripcion,
      },
    });
    await registrarAuditoria(
      {
        accion: "ADJUNTAR_DOCUMENTO",
        entidad: "Documento",
        entidadId: documento.id,
        detalle: {
          activoId,
          activoNombre: activo.nombreActivo,
          codigoPatrimonial: activo.codigoPatrimonial,
          tipoDocumento,
          nombreOriginal: file.name,
        },
        usuarioId,
      },
      tx
    );
    await crearNotificacionBroadcast(
      {
        tipo: "DOCUMENTO_AGREGADO",
        prioridad: "INFORMATIVA",
        titulo: "Documento agregado",
        mensaje: `Se agregó un documento a "${activo.nombreActivo}" (${activo.codigoPatrimonial}).`,
        entidad: "Activo",
        entidadId: activoId,
        excluirUsuarioId: usuarioId,
      },
      tx
    );
    return { id: documento.id };
  });
}
