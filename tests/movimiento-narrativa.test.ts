import { describe, expect, it } from "vitest";
import { narrarMovimiento, ubicacionActual, type MovimientoNarrable } from "@/lib/activos/movimiento-narrativa";

const huachipa = { name: "Huachipa" };
const cetpro = { name: "CETPRO - Huachipa" };
const sanIsidro = { name: "San Isidro" };
const sergio = { nombres: "Sergio", apellidos: "Ramos" };
const ana = { nombres: "Ana", apellidos: "Quispe" };

function movimiento(overrides: Partial<MovimientoNarrable>): MovimientoNarrable {
  return {
    tipo: "ALTA",
    motivo: null,
    observaciones: null,
    responsableAnterior: null,
    responsableNuevo: null,
    sedeAnterior: null,
    sedeNueva: null,
    unidadOperativaAnterior: null,
    unidadOperativaNueva: null,
    ambienteAnterior: null,
    ambienteNuevo: null,
    estadoAnterior: null,
    estadoNuevo: null,
    ...overrides,
  };
}

// Los tres movimientos reales de la base de desarrollo (20/10/2026), con
// exactamente los snapshots que guardaron.
describe("movimientos reales", () => {
  it("alta: registro con ubicación y estado inicial", () => {
    const n = narrarMovimiento(
      movimiento({ tipo: "ALTA", motivo: "Alta del activo", sedeNueva: huachipa, unidadOperativaNueva: cetpro, estadoNuevo: "DISPONIBLE" })
    );
    expect(n.titulo).toBe("Activo registrado en el sistema");
    expect(n.categoria.label).toBe("Alta");
    expect(n.resumen).toEqual(["Ubicación inicial: Huachipa › CETPRO - Huachipa", "Estado inicial: Disponible"]);
    expect(n.asignadoA).toBeNull();
    expect(n.detalles).toEqual([
      { label: "Estado inicial", antes: null, despues: "Disponible", cambio: true },
      { label: "Ubicación inicial", antes: null, despues: "Huachipa › CETPRO - Huachipa", cambio: true },
    ]);
  });

  it("asignación: nombra a quién, sin inventar ubicación", () => {
    const n = narrarMovimiento(
      movimiento({ tipo: "ASIGNACION", responsableNuevo: sergio, estadoAnterior: "DISPONIBLE", estadoNuevo: "ASIGNADO" })
    );
    expect(n.titulo).toBe("Activo asignado a Sergio Ramos");
    expect(n.asignadoA).toBe("Sergio Ramos");
    expect(n.resumen).toEqual(["Estado: Disponible → Asignado"]);
    expect(n.detalles.find((d) => d.label === "Responsable")).toEqual({
      label: "Responsable",
      antes: "Sin responsable anterior",
      despues: "Sergio Ramos",
      cambio: true,
    });
    // El movimiento no guardó ubicación: no se muestra ninguna.
    expect(n.detalles.some((d) => d.label.startsWith("Ubicación"))).toBe(false);
  });

  it("guardado como CAMBIO_UBICACION sin cambio de ubicación: se cuenta como cambio de estado", () => {
    const n = narrarMovimiento(
      movimiento({
        tipo: "CAMBIO_UBICACION",
        sedeAnterior: huachipa,
        sedeNueva: huachipa,
        unidadOperativaAnterior: cetpro,
        unidadOperativaNueva: cetpro,
        estadoAnterior: "ASIGNADO",
        estadoNuevo: "DISPONIBLE",
      })
    );
    expect(n.titulo).toBe("Estado cambiado de Asignado a Disponible");
    expect(n.categoria.label).toBe("Cambio de estado");
    expect(n.resumen).toEqual([]);
    expect(n.titulo).not.toMatch(/ubicaci/i);
    expect(n.detalles.find((d) => d.label === "Ubicación")).toMatchObject({ cambio: false });
    // No se dice que se haya retirado al responsable: el movimiento no lo registró.
    expect(n.asignadoA).toBeNull();
    expect(n.detalles.some((d) => d.label === "Responsable")).toBe(false);
  });
});

describe("demás tipos", () => {
  it("cambio de ubicación real", () => {
    const n = narrarMovimiento(
      movimiento({ tipo: "CAMBIO_UBICACION", sedeAnterior: huachipa, sedeNueva: huachipa, unidadOperativaNueva: cetpro })
    );
    expect(n.titulo).toBe("Ubicación actualizada de Huachipa a Huachipa › CETPRO - Huachipa");
    expect(n.categoria.label).toBe("Cambio de ubicación");
  });

  it("reasignación", () => {
    const n = narrarMovimiento(
      movimiento({ tipo: "REASIGNACION", responsableAnterior: sergio, responsableNuevo: ana, estadoAnterior: "ASIGNADO", estadoNuevo: "ASIGNADO" })
    );
    expect(n.titulo).toBe("Responsable cambiado de Sergio Ramos a Ana Quispe");
    expect(n.asignadoA).toBe("Ana Quispe");
    expect(n.resumen).toEqual([]);
  });

  it("desasignación: no la presenta como devolución física", () => {
    const n = narrarMovimiento(
      movimiento({ tipo: "CAMBIO_RESPONSABLE", responsableAnterior: sergio, estadoAnterior: "ASIGNADO", estadoNuevo: "DISPONIBLE" })
    );
    expect(n.titulo).toBe("Se retiró la asignación a Sergio Ramos");
    expect(n.titulo).not.toMatch(/devuel|entreg/i);
    expect(n.resumen).toEqual(["Estado: Asignado → Disponible"]);
    expect(n.asignadoA).toBeNull();
  });

  it("transferencia de sede", () => {
    const n = narrarMovimiento(movimiento({ tipo: "TRANSFERENCIA", sedeAnterior: huachipa, sedeNueva: sanIsidro }));
    expect(n.titulo).toBe("Sede cambiada de Huachipa a San Isidro");
  });

  it("baja con y sin motivo", () => {
    const conMotivo = narrarMovimiento(
      movimiento({ tipo: "BAJA", motivo: "Equipo inservible", estadoAnterior: "DISPONIBLE", estadoNuevo: "BAJA" })
    );
    expect(conMotivo.titulo).toBe("Activo dado de baja");
    expect(conMotivo.resumen).toEqual(["Motivo: Equipo inservible"]);
    const sinMotivo = narrarMovimiento(movimiento({ tipo: "BAJA", estadoAnterior: "DISPONIBLE", estadoNuevo: "BAJA" }));
    expect(sinMotivo.resumen).toEqual([]);
  });

  it("baja que además movió de sede: cuenta ambos cambios", () => {
    const n = narrarMovimiento(
      movimiento({ tipo: "BAJA", sedeAnterior: huachipa, sedeNueva: sanIsidro, estadoAnterior: "ASIGNADO", estadoNuevo: "BAJA" })
    );
    expect(n.resumen).toEqual(["Ubicación: Huachipa → San Isidro"]);
  });

  it("mantenimiento, retorno y reactivación", () => {
    expect(narrarMovimiento(movimiento({ tipo: "MANTENIMIENTO", estadoAnterior: "DISPONIBLE", estadoNuevo: "MANTENIMIENTO" })).titulo).toBe(
      "Activo registrado en mantenimiento"
    );
    expect(
      narrarMovimiento(movimiento({ tipo: "RETORNO_MANTENIMIENTO", estadoAnterior: "MANTENIMIENTO", estadoNuevo: "DISPONIBLE" })).titulo
    ).toBe("Activo salió de mantenimiento y quedó como Disponible");
    expect(narrarMovimiento(movimiento({ tipo: "REACTIVACION", estadoAnterior: "BAJA", estadoNuevo: "DISPONIBLE" })).titulo).toBe(
      "Activo reactivado como Disponible"
    );
  });

  it("valores faltantes se explican en vez de mostrar guiones", () => {
    const n = narrarMovimiento(movimiento({ tipo: "ALTA", estadoNuevo: "DISPONIBLE" }));
    expect(n.resumen[0]).toBe("Ubicación inicial: No especificada");
    expect(JSON.stringify(n)).not.toMatch(/"—"|→ —|— →/);
  });
});

describe("ubicación actual", () => {
  it("arma la ruta completa o null si no hay", () => {
    expect(ubicacionActual({ sede: huachipa, unidadOperativa: cetpro, ambiente: { name: "Almacén" } })).toBe(
      "Huachipa › CETPRO - Huachipa › Almacén"
    );
    expect(ubicacionActual({ sede: null, unidadOperativa: null, ambiente: null })).toBeNull();
  });
});
