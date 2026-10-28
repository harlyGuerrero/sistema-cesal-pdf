import { describe, expect, it } from "vitest";
import { SIN_UBICACION, buildCeldaWhere, filtrosLegibles, tituloSeleccion } from "@/lib/activos/reportes";

const matrizSedes = {
  filas: [
    { key: "s1", label: "Huachipa", counts: [], total: 0 },
    { key: SIN_UBICACION, label: "Sin sede", counts: [], total: 0 },
  ],
  sedeSeleccionada: undefined,
};
const tipos = new Map([["t1", { name: "Equipos informáticos" }]]);

describe("celda de la matriz como filtro", () => {
  it("por sede y tipo", () => {
    expect(buildCeldaWhere({ fila: "s1", col: "t1" }, false)).toEqual({ sedeId: "s1", tipoActivoId: "t1" });
  });

  it("con sede elegida filtra por unidad operativa", () => {
    expect(buildCeldaWhere({ fila: "u1" }, true)).toEqual({ unidadOperativaId: "u1" });
  });

  it("«Sin sede» filtra por sede nula, no por el texto", () => {
    expect(buildCeldaWhere({ fila: SIN_UBICACION }, false)).toEqual({ sedeId: null });
  });

  it("sin celda no filtra nada", () => {
    expect(buildCeldaWhere({}, false)).toEqual({});
  });
});

describe("textos del reporte", () => {
  it("título de la selección", () => {
    expect(tituloSeleccion(matrizSedes, tipos, {})).toBe("Todos los activos del reporte");
    expect(tituloSeleccion(matrizSedes, tipos, { fila: "s1", col: "t1" })).toBe("Equipos informáticos en Huachipa");
    expect(tituloSeleccion(matrizSedes, tipos, { col: "t1" })).toBe("Equipos informáticos en todas las sedes");
    expect(tituloSeleccion(matrizSedes, tipos, { fila: "s1" })).toBe("Todos los tipos en Huachipa");
    expect(
      tituloSeleccion({ ...matrizSedes, sedeSeleccionada: { id: "s1", name: "Huachipa" } }, tipos, { col: "t1" })
    ).toBe("Equipos informáticos en todo Huachipa");
  });

  it("filtros legibles", () => {
    expect(filtrosLegibles(matrizSedes, tipos, { tipoActivoId: "t1", estado: "ASIGNADO" }, { ASIGNADO: "Asignado" })).toBe(
      "Todas las sedes · Equipos informáticos · Estado Asignado"
    );
  });
});
