import { describe, expect, it } from "vitest";
import { RuleCategoryProvider } from "@/lib/classification/category-rules";

const provider = new RuleCategoryProvider();

describe("RuleCategoryProvider", () => {
  it("classifies one clear example per category", async () => {
    const cases: [string, string][] = [
      ["LAPTOP HP PAVILION 15 PULGADAS", "EQUIPOS_INFORMATICOS"],
      ["FOTOCOPIADORA CANON MULTIFUNCIONAL", "EQUIPOS_DE_OFICINA"],
      ["SILLA GERENCIAL RECLINABLE", "MOBILIARIO_Y_ENSERES"],
      ["CAMIONETA TOYOTA HILUX 4X4", "VEHICULOS_Y_MEDIOS_DE_TRANSPORTE"],
      ["GENERADOR ELECTRICO 5000W", "MAQUINARIA_Y_EQUIPOS"],
      ["LOCAL COMERCIAL AV. PRINCIPAL 123", "EDIFICACIONES"],
      ["FRIOBAR", "EQUIPOS_DE_OFICINA"],
      ["FRIGOBAR PORTATIL", "EQUIPOS_DE_OFICINA"],
      ["CALEFACTOR", "EQUIPOS_DE_OFICINA"],
      ["REFRIGERADORA LG 200L", "EQUIPOS_DE_OFICINA"],
      ["MICROONDAS 20L", "EQUIPOS_DE_OFICINA"],
      ["BALANZA", "EQUIPOS_DE_OFICINA"],
      ["HORNO A GAS", "EQUIPOS_DE_OFICINA"],
      ["COSTURA CASERA", "MAQUINARIA_Y_EQUIPOS"],
      ["MAQUINA DE COSER INDUSTRIAL", "MAQUINARIA_Y_EQUIPOS"],
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
