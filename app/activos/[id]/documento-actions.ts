"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { validateDocumentUpload, DocumentValidationError } from "@/lib/security/document-validation";
import { guardarDocumento } from "@/lib/documentos/storage";
import type { TipoDocumento } from "@/lib/generated/prisma/client";

// Fase 10 de Activos: subir/eliminar documentos adjuntos a un Activo. El
// archivo se valida igual que un PDF de Importaciones (MIME, extensión,
// tamaño, firma — ver lib/security/document-validation.ts) antes de tocar
// disco.

export async function subirDocumentoAction(activoId: string, formData: FormData): Promise<void> {
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

  await prisma.documento.create({
    data: {
      activoId,
      tipoDocumento,
      nombre: file.name,
      nombreOriginal: file.name,
      url: nombreArchivo,
      mimeType: tipoArchivo.mimeType,
      extension,
      tamanoBytes: buffer.length,
      descripcion,
    },
  });

  revalidatePath(`/activos/${activoId}`);
  revalidatePath(`/activos/${activoId}/ficha`);
}

export async function eliminarDocumentoAction(documentoId: string): Promise<void> {
  const documento = await prisma.documento.update({
    where: { id: documentoId },
    data: { estado: false },
  });

  revalidatePath(`/activos/${documento.activoId}`);
  revalidatePath(`/activos/${documento.activoId}/ficha`);
}
