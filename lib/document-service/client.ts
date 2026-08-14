import { processResponseSchema, type ProcessResponse } from "./contract";

// Único punto de contacto HTTP con el Document Service (ver ARCHITECTURE.md
// sección 2 — comunicación siempre por HTTP, nunca invocación de proceso local).

const DEFAULT_URL = "http://127.0.0.1:8001";
// Docling puede tardar ~20s en frío (medido en Fase 4); se deja margen.
const DEFAULT_TIMEOUT_MS = 90_000;

export class DocumentServiceError extends Error {}

export interface ProcessDocumentOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export async function processDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: ProcessDocumentOptions = {}
): Promise<ProcessResponse> {
  const baseUrl = options.baseUrl ?? process.env.DOCUMENT_SERVICE_URL ?? DEFAULT_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/v1/documents/process`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new DocumentServiceError(
      `No se pudo conectar con el Document Service: ${(error as Error).message}`
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new DocumentServiceError(`Document Service respondió ${response.status}: ${detail}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new DocumentServiceError("La respuesta del Document Service no es JSON válido");
  }

  const parsed = processResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new DocumentServiceError(
      `La respuesta del Document Service no cumple el contrato esperado: ${parsed.error.message}`
    );
  }

  return parsed.data;
}
