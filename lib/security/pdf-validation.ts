import { createHash } from "node:crypto";

// PDFs son input no confiable (ver ARCHITECTURE.md 9, skill security). Estas
// validaciones se aplican en cada límite de entrada — este es el de Next.js;
// el Document Service (Python) aplica las mismas por su cuenta, no se confía
// en que "ya se validó antes" entre servicios.

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = new Set(["application/pdf"]);
const ALLOWED_EXTENSIONS = new Set([".pdf"]);
const PDF_MAGIC_BYTES = Buffer.from("%PDF-");

export class PdfValidationError extends Error {}

function extensionOf(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex === -1 ? "" : filename.slice(dotIndex).toLowerCase();
}

export function validateExtension(filename: string): void {
  const ext = extensionOf(filename);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new PdfValidationError(`Extensión de archivo no permitida: ${ext || "(ninguna)"}`);
  }
}

export function validateMime(mimeType: string | null): void {
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new PdfValidationError(`Content-Type no permitido: ${mimeType ?? "(ninguno)"}`);
  }
}

export function validateSize(sizeBytes: number): void {
  if (sizeBytes === 0) {
    throw new PdfValidationError("El archivo está vacío");
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new PdfValidationError(
      `El archivo excede el tamaño máximo permitido (${MAX_FILE_SIZE_BYTES} bytes)`
    );
  }
}

export function validateSignature(buffer: Buffer): void {
  if (!buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)) {
    throw new PdfValidationError("La firma del archivo no corresponde a un PDF válido");
  }
}

export function validateUpload(filename: string, mimeType: string | null, buffer: Buffer): void {
  validateExtension(filename);
  validateMime(mimeType);
  validateSize(buffer.length);
  validateSignature(buffer);
}

export function computeHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
