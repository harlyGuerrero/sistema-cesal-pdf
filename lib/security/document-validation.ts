// Documentos adjuntos a un Activo son input no confiable, igual que los PDFs
// de Importaciones (ver ARCHITECTURE.md 9, skill security) — mismas reglas
// (MIME, extensión, tamaño, firma de archivo), generalizadas a los tipos que
// puede traer un documento patrimonial real: PDF (facturas, actas,
// certificados escaneados) y fotografías (JPG/PNG/WEBP). No se acepta Office
// (.doc/.xlsx) todavía — no lo pidió el encargo original, se agrega si hace
// falta.

export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export class DocumentValidationError extends Error {}

interface TipoArchivoPermitido {
  mimeType: string;
  extensions: string[];
  magicBytes: Buffer;
}

const TIPOS_PERMITIDOS: TipoArchivoPermitido[] = [
  { mimeType: "application/pdf", extensions: [".pdf"], magicBytes: Buffer.from("%PDF-") },
  { mimeType: "image/jpeg", extensions: [".jpg", ".jpeg"], magicBytes: Buffer.from([0xff, 0xd8, 0xff]) },
  {
    mimeType: "image/png",
    extensions: [".png"],
    magicBytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  { mimeType: "image/webp", extensions: [".webp"], magicBytes: Buffer.from("RIFF") },
];

function extensionOf(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex === -1 ? "" : filename.slice(dotIndex).toLowerCase();
}

export function validateDocumentUpload(
  filename: string,
  mimeType: string | null,
  buffer: Buffer
): TipoArchivoPermitido {
  if (buffer.length === 0) {
    throw new DocumentValidationError("El archivo está vacío.");
  }
  if (buffer.length > MAX_DOCUMENT_SIZE_BYTES) {
    throw new DocumentValidationError(
      `El archivo excede el tamaño máximo permitido (${MAX_DOCUMENT_SIZE_BYTES} bytes).`
    );
  }

  const ext = extensionOf(filename);
  const tipo = TIPOS_PERMITIDOS.find((t) => t.extensions.includes(ext));
  if (!tipo || mimeType !== tipo.mimeType) {
    throw new DocumentValidationError(
      `Tipo de archivo no permitido (${ext || "sin extensión"}, ${mimeType ?? "sin tipo"}). Se aceptan PDF, JPG, PNG y WEBP.`
    );
  }

  if (!buffer.subarray(0, tipo.magicBytes.length).equals(tipo.magicBytes)) {
    throw new DocumentValidationError("La firma del archivo no corresponde al tipo declarado.");
  }

  return tipo;
}
