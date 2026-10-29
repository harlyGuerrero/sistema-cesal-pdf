import { describe, expect, it } from "vitest";
import {
  esCodigoPatrimonial,
  normalizarCodigoEscaneado,
  urlDeCodigoEscaneado,
} from "@/lib/activos/codigo-escaneado";

describe("código escaneado de la etiqueta", () => {
  it("deja igual un código bien leído", () => {
    expect(normalizarCodigoEscaneado("INF-LE-26-0001")).toBe("INF-LE-26-0001");
  });

  it("corrige el guion de un lector configurado con otra distribución de teclado", () => {
    expect(normalizarCodigoEscaneado("INF'LE'26'0001")).toBe("INF-LE-26-0001");
    expect(normalizarCodigoEscaneado("INF?LE?26?0001")).toBe("INF-LE-26-0001");
    expect(normalizarCodigoEscaneado("INF_LE_26_0001")).toBe("INF-LE-26-0001");
  });

  it("pasa a mayúsculas y quita espacios sobrantes", () => {
    expect(normalizarCodigoEscaneado("  inf-le-26-0001\n")).toBe("INF-LE-26-0001");
  });

  it("reconoce la forma de un código patrimonial", () => {
    expect(esCodigoPatrimonial("INF-LE-26-0001")).toBe(true);
    expect(esCodigoPatrimonial("MOB-SI-25-12345")).toBe(true);
    expect(esCodigoPatrimonial("hola")).toBe(false);
    expect(esCodigoPatrimonial("INF-LE-26")).toBe(false);
  });

  it("arma la URL que abre la ficha", () => {
    expect(urlDeCodigoEscaneado("INF-LE-26-0001")).toBe("/activos/codigo/INF-LE-26-0001");
  });
});
