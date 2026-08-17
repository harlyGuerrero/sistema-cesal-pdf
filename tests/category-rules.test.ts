import { describe, expect, it } from "vitest";
import { RuleCategoryProvider } from "@/lib/classification/category-rules";

const provider = new RuleCategoryProvider();

describe("RuleCategoryProvider", () => {
  it("classifies one clear example per category", async () => {
    const cases: [string, string][] = [
      ["LAPTOP HP PAVILION 15 PULGADAS", "EQUIPOS_INFORMATICOS"],
      ["FOTOCOPIADORA CANON MULTIFUNCIONAL", "EQUIPOS_DE_OFICINA"],
      ["SILLA GERENCIAL RECLINABLE", "MUEBLES_DE_OFICINA"],
      ["CAMIONETA TOYOTA HILUX 4X4", "BIENES_VEHICULARES"],
      ["GENERADOR ELECTRICO 5000W", "EQUIPOS_DE_MAQUINARIA"],
      ["LOCAL COMERCIAL AV. PRINCIPAL 123", "BIENES_INMUEBLES"],
      ["FRIOBAR", "EQUIPOS_DE_OFICINA"],
      ["FRIGOBAR PORTATIL", "EQUIPOS_DE_OFICINA"],
      ["CALEFACTOR", "EQUIPOS_DE_OFICINA"],
      ["REFRIGERADORA LG 200L", "EQUIPOS_DE_OFICINA"],
      ["MICROONDAS 20L", "EQUIPOS_DE_OFICINA"],
      ["BALANZA", "EQUIPOS_DE_OFICINA"],
      ["HORNO A GAS", "EQUIPOS_DE_OFICINA"],
      ["COSTURA CASERA", "EQUIPOS_DE_MAQUINARIA"],
      ["MAQUINA DE COSER INDUSTRIAL", "EQUIPOS_DE_MAQUINARIA"],
    ];

    for (const [name, expected] of cases) {
      const result = await provider.classify({ normalizedName: name, name: null });
      expect(result?.value).toBe(expected);
      expect(result?.method).toBe("RULE");
      expect(result?.confidence).toBeGreaterThanOrEqual(0.8);
    }
  });

  it("returns null when nothing matches", async () => {
    const result = await provider.classify({ normalizedName: "XYZ123 PRODUCTO DESCONOCIDO", name: null });
    expect(result).toBeNull();
  });

  it("returns null when the name is ambiguous between categories", async () => {
    const result = await provider.classify({
      normalizedName: "MESA Y SILLA PARA CAMIONETA",
      name: null,
    });
    expect(result).toBeNull();
  });

  it("falls back to name when normalizedName is null", async () => {
    const result = await provider.classify({ normalizedName: null, name: "Monitor LG 24 pulgadas" });
    expect(result?.value).toBe("EQUIPOS_INFORMATICOS");
  });
});
