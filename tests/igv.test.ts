import { describe, expect, it } from "vitest";
import { formatMonto, preciosConIgv } from "@/lib/activos/igv";

describe("preciosConIgv", () => {
  it("agrega el 18% cuando la factura viene sin IGV", () => {
    expect(preciosConIgv(1000, "SIN_IGV")).toEqual({ sinIgv: 1000, conIgv: 1180 });
  });

  it("quita el 18% cuando la factura viene con IGV incluido", () => {
    expect(preciosConIgv(1180, "CON_IGV")).toEqual({ sinIgv: 1000, conIgv: 1180 });
  });

  it("redondea a céntimos", () => {
    expect(preciosConIgv(99.99, "SIN_IGV").conIgv).toBe(117.99);
  });

  it("una factura exonerada no cambia el precio", () => {
    expect(preciosConIgv(500, "EXONERADO")).toEqual({ sinIgv: 500, conIgv: 500 });
  });

  it("sin tratamiento definido no adivina", () => {
    expect(preciosConIgv(500, null)).toEqual({ sinIgv: null, conIgv: null });
  });
});

describe("formatMonto", () => {
  it("usa soles por defecto y dólares cuando la moneda es USD", () => {
    expect(formatMonto(1180, null)).toBe("S/ 1,180.00");
    expect(formatMonto(1180, "USD")).toBe("US$ 1,180.00");
  });

  it("devuelve null sin valor", () => {
    expect(formatMonto(null)).toBeNull();
  });
});
