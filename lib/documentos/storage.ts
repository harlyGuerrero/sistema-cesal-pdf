import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Fase 10 de Activos: almacenamiento local en disco, fuera de git y fuera de
// public/ (nunca servido por ruta directa — ver app/api/documentos/[id]).
// No existía ningún mecanismo de storage de archivos en el proyecto antes de
// esta fase (los PDFs de Importaciones se procesan en memoria y nunca se
// persisten, ver lib/import-workflow/process-upload.ts) — esto es nuevo, no
// una reutilización. Para un despliegue multi-instancia/serverless esto
// necesitaría moverse a almacenamiento de objetos (S3 o similar); no se
// construye eso ahora porque no hay ese entorno que probarlo ni se pidió.

const STORAGE_ROOT = path.join(process.cwd(), "document-storage");

function activoDir(activoId: string): string {
  return path.join(STORAGE_ROOT, "activos", activoId);
}

// El nombre físico nunca usa el nombre original del usuario (evita path
// traversal y colisiones) — solo un UUID generado acá, con la extensión ya
// validada por lib/security/document-validation.ts.
export async function guardarDocumento(
  activoId: string,
  extension: string,
  buffer: Buffer
): Promise<string> {
  const nombreArchivo = `${randomUUID()}${extension}`;
  const dir = activoDir(activoId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, nombreArchivo), buffer);
  return nombreArchivo;
}

export async function leerDocumento(activoId: string, nombreArchivo: string): Promise<Buffer> {
  return readFile(path.join(activoDir(activoId), nombreArchivo));
}
