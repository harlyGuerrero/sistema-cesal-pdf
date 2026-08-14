import { z } from "zod";
import type { NormalizedProductCandidate } from "@/lib/normalization/normalize";

// Fase 6: ProductCandidate -> Relevance, antes de la clasificación patrimonial
// (ver ARCHITECTURE.md 5.1, skill product-classification). Solo reglas
// determinísticas por ahora — el fallback a Ollama para casos de baja
// confianza se conecta en Fase 7 (ClassificationProvider), no aquí.

export const relevanceSchema = z.enum(["PRODUCT", "CONSUMABLE", "SERVICE", "OTHER"]);
export type Relevance = z.infer<typeof relevanceSchema>;

export interface RelevanceClassification {
  relevance: Relevance;
  confidence: number;
  method: "RULE";
}

const MATCHED_CONFIDENCE = 0.9;
const DEFAULT_PRODUCT_CONFIDENCE = 0.65;

// Se agotan con el uso (ver ARCHITECTURE.md 5.1). Alcance acotado al dominio de
// las 6 categorías patrimoniales (oficina/TI/vehicular/maquinaria) — no es la
// "lista enorme de palabras prohibidas" que ARCHITECTURE.md 4 prohíbe para
// detección estructural; esto es clasificación semántica, un problema distinto.
const CONSUMABLE_PATTERNS: RegExp[] = [
  /\bTINTA\b/,
  /\bT[OÓ]NER\b/,
  /\bCARTUCHO\b/,
  /\bRESMA\b/,
  /\bPAPEL BOND\b/,
  /\bGRAPAS?\b/,
  /\bCLIPS?\b/,
  /\bPILAS?\b/,
  /\bCOMBUSTIBLE\b/,
  /\bGASOLINA\b/,
  /\bDI[EÉ]SEL\b/,
  /\bLUBRICANTE\b/,
  /\bACEITE\b/,
  /\bFILTRO DE (ACEITE|AIRE)\b/,
];

// No son un bien físico (ver ARCHITECTURE.md 5.1).
const SERVICE_PATTERNS: RegExp[] = [
  /\bSERVICIO\b/,
  /\bINSTALACI[OÓ]N\b/,
  /\bMANTENIMIENTO\b/,
  /\bREPARACI[OÓ]N\b/,
  /\bCAPACITACI[OÓ]N\b/,
  /\bSOPORTE T[EÉ]CNICO\b/,
  /\bCONSULTOR[IÍ]A\b/,
  /\bASESOR[IÍ]A\b/,
  /\bFLETE\b/,
  /\bTRANSPORTE\b/,
  /\bENV[IÍ]O\b/,
  /\bLICENCIA\b/,
  /\bSUSCRIPCI[OÓ]N\b/,
  /\bALQUILER\b/,
  /\bARRENDAMIENTO\b/,
];

function matchesAny(patterns: RegExp[], text: string): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function classifyRelevance(
  candidate: Pick<NormalizedProductCandidate, "normalizedName" | "name">
): RelevanceClassification {
  const text = (candidate.normalizedName ?? candidate.name ?? "").toUpperCase();

  if (matchesAny(CONSUMABLE_PATTERNS, text)) {
    return { relevance: "CONSUMABLE", confidence: MATCHED_CONFIDENCE, method: "RULE" };
  }
  if (matchesAny(SERVICE_PATTERNS, text)) {
    return { relevance: "SERVICE", confidence: MATCHED_CONFIDENCE, method: "RULE" };
  }

  // Sin señal de consumible/servicio: por defecto es un producto (la mayoría
  // de filas de una tabla de ítems lo son), pero con confianza moderada —
  // no es una certeza, es ausencia de evidencia en contra. `OTHER` queda
  // reservado para cuando el fallback de Ollama (Fase 7) esté conectado; el
  // motor de reglas nunca lo asigna directamente.
  return { relevance: "PRODUCT", confidence: DEFAULT_PRODUCT_CONFIDENCE, method: "RULE" };
}
