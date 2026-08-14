import { describe, expect, it } from "vitest";
import { classifyRelevance } from "@/lib/classification/relevance";

describe("classifyRelevance", () => {
  it("classifies ink as CONSUMABLE (ver ejemplo Fase 6: Tinta HP)", () => {
    const result = classifyRelevance({ normalizedName: "TINTA HP", name: "Tinta HP" });
    expect(result.relevance).toBe("CONSUMABLE");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.method).toBe("RULE");
  });

  it("classifies other common consumables", () => {
    expect(classifyRelevance({ normalizedName: "RESMA DE PAPEL BOND A4", name: null }).relevance).toBe(
      "CONSUMABLE"
    );
    expect(classifyRelevance({ normalizedName: "TÓNER PARA IMPRESORA HP", name: null }).relevance).toBe(
      "CONSUMABLE"
    );
    expect(classifyRelevance({ normalizedName: "COMBUSTIBLE DIESEL", name: null }).relevance).toBe(
      "CONSUMABLE"
    );
  });

  it("classifies services as SERVICE", () => {
    expect(
      classifyRelevance({ normalizedName: "SERVICIO DE INSTALACIÓN DE AIRE ACONDICIONADO", name: null })
        .relevance
    ).toBe("SERVICE");
    expect(classifyRelevance({ normalizedName: "MANTENIMIENTO PREVENTIVO", name: null }).relevance).toBe(
      "SERVICE"
    );
    expect(classifyRelevance({ normalizedName: "FLETE Y TRANSPORTE", name: null }).relevance).toBe(
      "SERVICE"
    );
  });

  it("defaults to PRODUCT with moderate confidence when no signal matches", () => {
    const result = classifyRelevance({ normalizedName: "MONITOR TEROS", name: null });
    expect(result.relevance).toBe("PRODUCT");
    expect(result.confidence).toBeLessThan(0.9);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("never returns OTHER (reserved for the Ollama fallback in Fase 7)", () => {
    const samples = ["MONITOR TEROS", "TINTA HP", "SERVICIO DE INSTALACIÓN", "SILLA ERGONÓMICA", "XYZ123"];
    for (const name of samples) {
      const result = classifyRelevance({ normalizedName: name, name: null });
      expect(result.relevance).not.toBe("OTHER");
    }
  });

  it("falls back to name when normalizedName is null", () => {
    const result = classifyRelevance({ normalizedName: null, name: "Tinta HP" });
    expect(result.relevance).toBe("CONSUMABLE");
  });
});
