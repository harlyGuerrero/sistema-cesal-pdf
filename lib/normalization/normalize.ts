import { z } from "zod";
import { productCandidateSchema, type ProductCandidate } from "@/lib/document-service/contract";

// Fase 5: etapa separada entre Extraction y Relevance (ver ARCHITECTURE.md,
// CLAUDE.md regla 2). Nunca modifica rawText — solo agrega campos normalized*.

export const normalizedProductCandidateSchema = productCandidateSchema.extend({
  normalizedName: z.string().nullable(),
  normalizedQuantity: z.number().nullable(),
  normalizedUnitPrice: z.number().nullable(),
  normalizedTotalPrice: z.number().nullable(),
  normalizedCurrency: z.string().nullable(),
});

export type NormalizedProductCandidate = z.infer<typeof normalizedProductCandidateSchema>;

// Símbolos de moneda universales (ISO 4217), no una lista de proveedores ni
// de encabezados — distinto de la prohibición estructural en ARCHITECTURE.md 4.
const CURRENCY_SYMBOLS: [RegExp, string][] = [
  [/\bUS\$|\bUSD\b/i, "USD"],
  [/\bEUR\b|€/i, "EUR"],
  [/\bS\/\.?/i, "PEN"],
  [/\$/, "USD"],
];

const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
const NOISE_EDGE_CHARS = /^[|_\-.\s]+|[|_\-.\s]+$/g;
const MULTI_SPACE = /\s+/g;

export function normalizeName(name: string | null): string | null {
  if (!name) return null;

  const cleaned = name
    .normalize("NFKC")
    .replace(CONTROL_CHARS, " ")
    .replace(MULTI_SPACE, " ")
    .trim()
    .replace(NOISE_EDGE_CHARS, "")
    .trim()
    .toUpperCase();

  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeQuantity(quantity: number | null): number | null {
  if (quantity === null || !Number.isFinite(quantity)) return null;
  return Math.round(quantity * 1000) / 1000;
}

export function normalizeAmount(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

export function normalizeCurrency(currency: string | null, rawText: string): string | null {
  if (currency && currency.trim()) return currency.trim().toUpperCase();

  for (const [pattern, code] of CURRENCY_SYMBOLS) {
    if (pattern.test(rawText)) return code;
  }
  return null;
}

export function normalizeProductCandidate(
  candidate: ProductCandidate
): NormalizedProductCandidate {
  return {
    ...candidate,
    normalizedName: normalizeName(candidate.name),
    normalizedQuantity: normalizeQuantity(candidate.quantity),
    normalizedUnitPrice: normalizeAmount(candidate.unitPrice),
    normalizedTotalPrice: normalizeAmount(candidate.totalPrice),
    normalizedCurrency: normalizeCurrency(candidate.currency, candidate.rawText),
  };
}
