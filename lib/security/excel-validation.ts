// Un .xlsx subido por el usuario es input no confiable, igual que un PDF
// (ver lib/security/pdf-validation.ts, skill security) — mismas 4
// validaciones (extensión/MIME/tamaño/firma) antes de dejar que exceljs lo
// parsee. Un .xlsx es un ZIP: la firma son los magic bytes de ZIP ("PK\x03\x04").

export const MAX_EXCEL_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_EXCEL_ROWS = 2000;

const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Algunos navegadores/OS mandan esto para .xlsx en vez del MIME correcto.
  "application/octet-stream",
]);
const ALLOWED_EXTENSIONS = new Set([".xlsx"]);
const ZIP_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export class ExcelValidationError extends Error {}

function extensionOf(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex === -1 ? "" : filename.slice(dotIndex).toLowerCase();
}

export function validateExcelUpload(filename: string, mimeType: string | null, buffer: Buffer): void {
  const ext = extensionOf(filename);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new ExcelValidationError(`Extensión de archivo no permitida: ${ext || "(ninguna)"} — se espera .xlsx`);
  }
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ExcelValidationError(`Content-Type no permitido: ${mimeType}`);
  }
  if (buffer.length === 0) {
    throw new ExcelValidationError("El archivo está vacío.");
  }
  if (buffer.length > MAX_EXCEL_FILE_SIZE_BYTES) {
    throw new ExcelValidationError(`El archivo excede el tamaño máximo permitido (${MAX_EXCEL_FILE_SIZE_BYTES} bytes).`);
  }
  if (!buffer.subarray(0, ZIP_MAGIC_BYTES.length).equals(ZIP_MAGIC_BYTES)) {
    throw new ExcelValidationError("La firma del archivo no corresponde a un .xlsx válido.");
  }
}
