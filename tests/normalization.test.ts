import { describe, expect, it } from "vitest";
import {
  normalizeAmount,
  normalizeCurrency,
  normalizeName,
  normalizeProductCandidate,
  normalizeQuantity,
} from "@/lib/normalization/normalize";
import type { ProductCandidate } from "@/lib/document-service/contract";

describe("normalizeName", () => {
  it("collapses whitespace without touching rawText", () => {
    expect(normalizeName(" MONITOR   TEROS ")).toBe("MONITOR TEROS");
  });

  it("uppercases and trims stray table-cell noise", () => {
    expect(normalizeName("| teclado mecánico --")).toBe("TECLADO MECÁNICO");
  });

  it("returns null for empty or null input", () => {
    expect(normalizeName("")).toBeNull();
    expect(normalizeName(null)).toBeNull();
    expect(normalizeName("   ")).toBeNull();
  });
});

describe("normalizeQuantity / normalizeAmount", () => {
  it("rounds to the expected precision", () => {
    expect(normalizeQuantity(1.00004)).toBe(1);
    expect(normalizeAmount(1500.005)).toBeCloseTo(1500.01, 2);
  });

  it("passes null through", () => {
    expect(normalizeQuantity(null)).toBeNull();
    expect(normalizeAmount(null)).toBeNull();
  });
});

describe("normalizeCurrency", () => {
  it("detects PEN, USD and EUR symbols from rawText", () => {
    expect(normalizeCurrency(null, "MONITOR | 1 | S/ 1500.00 | S/ 1500.00")).toBe("PEN");
    expect(normalizeCurrency(null, "MONITOR | 1 | $1500.00 | $1500.00")).toBe("USD");
    expect(normalizeCurrency(null, "MONITOR | 1 | 1500.00 EUR | 1500.00 EUR")).toBe("EUR");
  });

  it("returns null instead of guessing when no symbol is present", () => {
    expect(normalizeCurrency(null, "MONITOR | 1 | 1500.00 | 1500.00")).toBeNull();
  });
});

describe("normalizeProductCandidate", () => {
  const base: ProductCandidate = {
    rawText: " MONITOR   TEROS | 1 | S/ 1500.00 | S/ 1500.00",
    name: " MONITOR   TEROS ",
    quantity: 1,
    unitPrice: 1500,
    totalPrice: 1500,
    currency: null,
    source: { page: 1, table: 0, row: 1 },
    confidence: 0.95,
  };

  it("never mutates rawText", () => {
    const result = normalizeProductCandidate(base);
    expect(result.rawText).toBe(base.rawText);
  });

  it("produces normalized fields alongside the original ones", () => {
    const result = normalizeProductCandidate(base);
    expect(result.normalizedName).toBe("MONITOR TEROS");
    expect(result.normalizedQuantity).toBe(1);
    expect(result.normalizedUnitPrice).toBe(1500);
    expect(result.normalizedTotalPrice).toBe(1500);
    expect(result.normalizedCurrency).toBe("PEN");
  });
});
