import { z } from "zod";
import type { ClassificationProvider, ClassificationResult } from "./provider";
import { categoryCodeSchema, type CategoryClassificationInput, type CategoryCode } from "./category-schema";

// Fallback semántico para productos que las reglas no resuelven (ver skill
// ollama: no es el parser principal, no se usa para tapar errores de
// extracción — solo clasificación en casos ambiguos).

const SYSTEM_PROMPT = `Clasificas nombres de productos de facturas en exactamente una categoria patrimonial. Categorias y ejemplos:
EQUIPOS_INFORMATICOS: laptop, computadora, monitor, impresora, servidor, router, teclado, mouse, tablet, proyector.
EQUIPOS_DE_OFICINA: fotocopiadora, telefono fijo, calculadora, aire acondicionado, fax, friobar, frigobar, refrigeradora, calefactor, ventilador, microondas, hervidor, dispensador de agua, cafetera.
MUEBLES_DE_OFICINA: escritorio, silla, archivador, estante, mesa, libreros.
BIENES_VEHICULARES: camioneta, automovil, camion, motocicleta, furgon, bus.
EQUIPOS_DE_MAQUINARIA: generador, compresora, montacargas, excavadora, tractor, soldadora.
BIENES_INMUEBLES: terreno, edificio, local comercial, predio, almacen, nave industrial.
Responde solo JSON con category y confidence (0 a 1).`;

// Espejo del schema de validación de abajo — Ollama exige el JSON Schema
// aparte del tipado Zod, no hay forma de derivarlo automáticamente sin
// agregar una dependencia nueva (zod-to-json-schema), que no se justifica
// para un solo schema pequeño.
const CATEGORY_JSON_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: categoryCodeSchema.options,
    },
    confidence: { type: "number" },
  },
  required: ["category", "confidence"],
};

const ollamaResponseSchema = z.object({
  message: z.object({
    content: z.string(),
  }),
});

// Nunca se confía en el texto libre del modelo: se parsea como JSON y se
// valida contra este schema antes de usarse (ver skill ollama).
const categoryContentSchema = z.object({
  category: categoryCodeSchema,
  confidence: z.number().min(0).max(1),
});

export interface OllamaCategoryProviderOptions {
  host?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class OllamaCategoryProvider
  implements ClassificationProvider<CategoryClassificationInput, CategoryCode>
{
  private readonly host: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OllamaCategoryProviderOptions = {}) {
    this.host = options.host ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
    this.model = options.model ?? process.env.OLLAMA_CATEGORY_MODEL ?? "qwen2.5:3b-instruct";
    // El primer request tras iniciar/cambiar de modelo en Ollama puede tardar
    // ~15s solo en cargarlo en memoria (medido en Fase 7); 30s da margen para
    // no perder una clasificación válida por un timeout demasiado agresivo.
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async classify(
    input: CategoryClassificationInput
  ): Promise<ClassificationResult<CategoryCode> | null> {
    const name = input.normalizedName ?? input.name;
    if (!name) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Producto: ${name}` },
          ],
          stream: false,
          options: { temperature: 0 },
          format: CATEGORY_JSON_SCHEMA,
        }),
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const envelope = ollamaResponseSchema.safeParse(await response.json());
      if (!envelope.success) return null;

      let parsedContent: unknown;
      try {
        parsedContent = JSON.parse(envelope.data.message.content);
      } catch {
        return null;
      }

      const result = categoryContentSchema.safeParse(parsedContent);
      if (!result.success) return null;

      return { value: result.data.category, confidence: result.data.confidence, method: "OLLAMA" };
    } catch {
      // Ollama no disponible, timeout, red caída: sin respuesta. No se
      // inventa una clasificación — el ítem queda para revisión humana.
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
