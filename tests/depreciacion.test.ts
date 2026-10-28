import { describe, expect, it } from "vitest";
import {
  HISTORIAL_VACIO,
  agregarHistorial,
  depreciacionTrimestralTeorica,
  formatPeriodo,
  formatSoles,
  parseCentavos,
  periodoActual,
  planificarDepreciacion,
  resumirDepreciacion,
  trimestreDeFecha,
  valorContableCalculado,
  type ActivoDepreciable,
  type PeriodoCalculado,
  type Periodo,
} from "@/lib/depreciacion/calculo";
import { TASAS_OFICIALES_CESAL, formatTasa, parseTasa, tasaTrimestralDesdeAnual } from "@/lib/depreciacion/tasas";
import { calcularTotales, ordenarFilas, resolverCorte, type FilaDepreciacion } from "@/lib/depreciacion/listado";
import { cambiosBloqueadosPorDepreciacion } from "@/lib/depreciacion/proteccion";
import { puedeProcesarDepreciacion, validarPeriodoObjetivo } from "@/lib/depreciacion/procesamiento";

// "Hoy" fijo para que el trimestre en curso no dependa del día en que corre
// el test: 4T 2026.
const AHORA = new Date("2026-10-20T12:00:00Z");

function activo(overrides: Partial<ActivoDepreciable> = {}): ActivoDepreciable {
  return {
    costoAdquisicion: "4000.00",
    fechaAdquisicion: new Date("2026-05-20"),
    estadoPatrimonial: "DISPONIBLE",
    tasaAnual: "25.0000",
    ...overrides,
  };
}

function planCompleto(a: ActivoDepreciable, hasta: Periodo): PeriodoCalculado[] {
  const plan = planificarDepreciacion(a, HISTORIAL_VACIO, hasta, AHORA);
  if (plan.tipo !== "pendiente") throw new Error(`Se esperaba un plan pendiente, llegó ${plan.tipo}`);
  return plan.periodos;
}

describe("tasas oficiales de CESAL", () => {
  it("aplica las siete tasas anuales y su trimestral (anual / 4)", () => {
    const esperado = {
      EDIFICACIONES: ["5,00 %", "1,25 %"],
      VEHICULOS_Y_MEDIOS_DE_TRANSPORTE: ["10,00 %", "2,50 %"],
      EQUIPOS_INFORMATICOS: ["25,00 %", "6,25 %"],
      EQUIPOS_DE_OFICINA: ["10,00 %", "2,50 %"],
      ACTIVOS_INTANGIBLES_INFORMATICOS: ["25,00 %", "6,25 %"],
      MAQUINARIA_Y_EQUIPOS: ["10,00 %", "2,50 %"],
      MOBILIARIO_Y_ENSERES: ["10,00 %", "2,50 %"],
    };
    expect(Object.keys(TASAS_OFICIALES_CESAL).sort()).toEqual(Object.keys(esperado).sort());
    for (const [code, [anual, trimestral]] of Object.entries(esperado)) {
      const tasa = parseTasa(TASAS_OFICIALES_CESAL[code as keyof typeof TASAS_OFICIALES_CESAL])!;
      expect(formatTasa(tasa)).toBe(anual);
      expect(formatTasa(tasaTrimestralDesdeAnual(tasa))).toBe(trimestral);
    }
  });

  it("deprecia S/ 1.000,00 por trimestre según la tasa de cada tipo", () => {
    const porTasa: Record<string, number> = { "5": 1250, "10": 2500, "25": 6250 };
    for (const tasaAnual of Object.values(TASAS_OFICIALES_CESAL)) {
      const trimestral = tasaTrimestralDesdeAnual(parseTasa(tasaAnual)!)!;
      expect(depreciacionTrimestralTeorica(100_000, trimestral)).toBe(porTasa[tasaAnual]);
    }
  });

  it("rechaza tasas fuera de (0, 100] o con formato inválido", () => {
    expect(parseTasa("0")).toBeNull();
    expect(parseTasa("100.0001")).toBeNull();
    expect(parseTasa("-5")).toBeNull();
    expect(parseTasa("abc")).toBeNull();
    expect(parseTasa("6.25")).toBe(62_500);
  });
});

describe("trimestre de adquisición", () => {
  it.each([
    ["2026-01-01", 1],
    ["2026-02-14", 1],
    ["2026-03-31", 1],
    ["2026-04-01", 2],
    ["2026-05-20", 2],
    ["2026-06-30", 2],
    ["2026-07-01", 3],
    ["2026-08-15", 3],
    ["2026-09-30", 3],
    ["2026-10-01", 4],
    ["2026-11-11", 4],
    ["2026-12-31", 4],
  ])("una compra del %s empieza en el trimestre %i", (fecha, trimestre) => {
    expect(trimestreDeFecha(new Date(fecha))).toEqual({ anio: 2026, trimestre });
    const periodos = planCompleto(activo({ fechaAdquisicion: new Date(fecha) }), { anio: 2026, trimestre: 4 });
    expect(periodos[0]).toMatchObject({ anio: 2026, trimestre });
    // Trimestre completo aunque la compra sea el último día del trimestre.
    expect(periodos[0].importeCentavos).toBe(25_000);
  });

  it("toma el trimestre en curso en hora de Lima", () => {
    // 1 de enero 03:00 UTC = 31 de diciembre 22:00 en Lima.
    expect(periodoActual(new Date("2027-01-01T03:00:00Z"))).toEqual({ anio: 2026, trimestre: 4 });
    expect(periodoActual(new Date("2027-01-01T06:00:00Z"))).toEqual({ anio: 2027, trimestre: 1 });
  });
});

describe("cálculo de la depreciación", () => {
  it("valida el ejemplo de CESAL: S/ 4.000,00 del 20/05/2026 al 25 %", () => {
    const [primero] = planCompleto(activo(), { anio: 2026, trimestre: 2 });
    expect(formatPeriodo(primero)).toBe("2T 2026");
    expect(formatSoles(primero.importeCentavos)).toBe("S/ 250,00");
    expect(formatSoles(primero.acumuladoCentavos)).toBe("S/ 250,00");
    expect(formatSoles(primero.valorNetoCentavos)).toBe("S/ 3.750,00");
  });

  it("calcula cada trimestre sobre el costo original, no sobre el saldo", () => {
    const periodos = planCompleto(activo(), { anio: 2026, trimestre: 4 });
    expect(periodos.map((p) => p.importeCentavos)).toEqual([25_000, 25_000, 25_000]);
    expect(periodos.map((p) => p.valorNetoCentavos)).toEqual([375_000, 350_000, 325_000]);
  });

  it("llega exactamente a S/ 0,00 sin valores negativos y deja de depreciar", () => {
    const periodos = planCompleto(activo({ fechaAdquisicion: new Date("2020-02-01") }), { anio: 2026, trimestre: 4 });
    expect(periodos).toHaveLength(16); // 25 % anual -> 4 años
    expect(periodos.at(-1)).toMatchObject({ anio: 2023, trimestre: 4, acumuladoCentavos: 400_000, valorNetoCentavos: 0 });
    for (const p of periodos) {
      expect(p.importeCentavos).toBeGreaterThan(0);
      expect(p.valorNetoCentavos).toBeGreaterThanOrEqual(0);
      expect(p.acumuladoCentavos).toBeLessThanOrEqual(400_000);
    }
  });

  it("el último periodo deprecia solo el saldo pendiente", () => {
    // 1.000,10 × 6,25 % = 62,50625 -> 62,51 (half-up). 15 × 62,51 = 937,65;
    // el 16.º periodo deprecia solo el saldo: 62,45.
    const periodos = planCompleto(activo({ costoAdquisicion: "1000.10", fechaAdquisicion: new Date("2020-02-01") }), {
      anio: 2026,
      trimestre: 4,
    });
    expect(periodos).toHaveLength(16);
    expect(periodos[0].importeCentavos).toBe(6_251);
    expect(periodos.at(-1)!.importeCentavos).toBe(6_245);
    expect(periodos.at(-1)!.valorNetoCentavos).toBe(0);
    expect(periodos.reduce((t, p) => t + p.importeCentavos, 0)).toBe(100_010);
  });

  it("redondea half-up a centavos", () => {
    expect(depreciacionTrimestralTeorica(1, 62_500)).toBe(0); // 0,0625 céntimos
    expect(depreciacionTrimestralTeorica(8, 62_500)).toBe(1); // 0,5 -> 1
    expect(depreciacionTrimestralTeorica(100_010, 62_500)).toBe(6_251);
  });

  it("aun con un costo de 1 céntimo termina en S/ 0,00", () => {
    const periodos = planCompleto(activo({ costoAdquisicion: "0.01" }), { anio: 2026, trimestre: 4 });
    expect(periodos).toHaveLength(1);
    expect(periodos[0]).toMatchObject({ importeCentavos: 1, valorNetoCentavos: 0 });
  });
});

describe("activos que no se pueden depreciar", () => {
  it.each([
    ["sin fecha", { fechaAdquisicion: null }, "SIN_FECHA"],
    ["sin costo", { costoAdquisicion: null }, "SIN_COSTO"],
    ["costo cero", { costoAdquisicion: "0" }, "SIN_COSTO"],
    ["costo negativo", { costoAdquisicion: "-10" }, "SIN_COSTO"],
    ["fecha futura", { fechaAdquisicion: new Date("2027-02-01") }, "FECHA_FUTURA"],
  ] as const)("%s: pendiente de revisión, sin inventar valores", (_, overrides, codigo) => {
    const a = activo(overrides);
    const plan = planificarDepreciacion(a, HISTORIAL_VACIO, { anio: 2026, trimestre: 4 }, AHORA);
    expect(plan.tipo).toBe("error");
    expect(plan.tipo === "error" && plan.problemas.map((p) => p.codigo)).toContain(codigo);
    const resumen = resumirDepreciacion(a, HISTORIAL_VACIO, AHORA);
    expect(resumen.estado).toBe("PENDIENTE_REVISION");
    expect(resumen.acumuladoCentavos).toBe(0);
  });

  it("sin tasa configurada: configuración pendiente y no se deprecia", () => {
    const a = activo({ tasaAnual: null });
    const plan = planificarDepreciacion(a, HISTORIAL_VACIO, { anio: 2026, trimestre: 4 }, AHORA);
    expect(plan).toMatchObject({ tipo: "error", problemas: [{ codigo: "SIN_TASA" }] });
    expect(resumirDepreciacion(a, HISTORIAL_VACIO, AHORA).estado).toBe("CONFIGURACION_PENDIENTE");
  });

  it("dado de baja sin fecha registrada: se omite", () => {
    const plan = planificarDepreciacion(activo({ estadoPatrimonial: "BAJA" }), HISTORIAL_VACIO, { anio: 2026, trimestre: 4 }, AHORA);
    expect(plan).toEqual({ tipo: "omitido", motivo: "DADO_DE_BAJA" });
  });

  it("dado de baja con fecha: se deprecia hasta el trimestre de la baja inclusive", () => {
    const a = activo({ estadoPatrimonial: "BAJA", fechaBaja: new Date("2026-08-15") });
    const plan = planificarDepreciacion(a, HISTORIAL_VACIO, { anio: 2026, trimestre: 4 }, AHORA);
    expect(plan.tipo === "pendiente" && plan.periodos.map((p) => `${p.anio}-T${p.trimestre}`)).toEqual([
      "2026-T2",
      "2026-T3",
    ]);

    const historial = agregarHistorial(planCompleto(activo(), { anio: 2026, trimestre: 3 }));
    expect(planificarDepreciacion(a, historial, { anio: 2026, trimestre: 4 }, AHORA)).toEqual({
      tipo: "omitido",
      motivo: "DADO_DE_BAJA",
    });
  });

  it("adquirido después del trimestre procesado: se omite", () => {
    const plan = planificarDepreciacion(activo(), HISTORIAL_VACIO, { anio: 2026, trimestre: 1 }, AHORA);
    expect(plan).toEqual({ tipo: "omitido", motivo: "ADQUIRIDO_DESPUES" });
  });
});

describe("reprocesamiento e historial", () => {
  it("reprocesar un trimestre ya registrado no genera nada nuevo", () => {
    const a = activo();
    const primero = planCompleto(a, { anio: 2026, trimestre: 2 });
    const plan = planificarDepreciacion(a, agregarHistorial(primero), { anio: 2026, trimestre: 2 }, AHORA);
    expect(plan).toEqual({ tipo: "al_dia" });
  });

  it("procesar un trimestre posterior continúa desde el último registrado, sin huecos", () => {
    const a = activo();
    const primero = planCompleto(a, { anio: 2026, trimestre: 2 });
    const plan = planificarDepreciacion(a, agregarHistorial(primero), { anio: 2026, trimestre: 4 }, AHORA);
    expect(plan.tipo === "pendiente" && plan.periodos.map(formatPeriodo)).toEqual(["3T 2026", "4T 2026"]);
    expect(plan.tipo === "pendiente" && plan.periodos.at(-1)!.acumuladoCentavos).toBe(75_000);
  });

  it("un activo antiguo registra todos los trimestres desde su adquisición", () => {
    const periodos = planCompleto(activo({ tasaAnual: "10", costoAdquisicion: "1000", fechaAdquisicion: new Date("2024-08-01") }), {
      anio: 2026,
      trimestre: 4,
    });
    expect(periodos.map(formatPeriodo)).toEqual([
      "3T 2024", "4T 2024", "1T 2025", "2T 2025", "3T 2025", "4T 2025", "1T 2026", "2T 2026", "3T 2026", "4T 2026",
    ]);
    expect(periodos.at(-1)!.acumuladoCentavos).toBe(25_000);
  });

  it("totalmente depreciado: se omite y queda con valor neto S/ 0,00 y su costo", () => {
    const a = activo({ fechaAdquisicion: new Date("2020-02-01") });
    const historial = agregarHistorial(planCompleto(a, { anio: 2026, trimestre: 4 }));
    expect(planificarDepreciacion(a, historial, { anio: 2026, trimestre: 4 }, AHORA)).toEqual({
      tipo: "omitido",
      motivo: "TOTALMENTE_DEPRECIADO",
    });
    const resumen = resumirDepreciacion(a, historial, AHORA);
    expect(resumen).toMatchObject({
      estado: "TOTALMENTE_DEPRECIADO",
      costoCentavos: 400_000,
      acumuladoCentavos: 400_000,
      valorNetoCentavos: 0,
      porcentajeDepreciado: 100,
      cantidadPeriodos: 16,
    });
  });

  it("marca para revisión si el costo cambió después de depreciar", () => {
    const historial = agregarHistorial(planCompleto(activo(), { anio: 2026, trimestre: 3 }));
    const editado = activo({ costoAdquisicion: "5000" });
    expect(resumirDepreciacion(editado, historial, AHORA).estado).toBe("PENDIENTE_REVISION");
    expect(planificarDepreciacion(editado, historial, { anio: 2026, trimestre: 4 }, AHORA).tipo).toBe("error");
  });

  it("marca para revisión si la fecha de adquisición se movió", () => {
    const historial = agregarHistorial(planCompleto(activo(), { anio: 2026, trimestre: 3 }));
    const editado = activo({ fechaAdquisicion: new Date("2026-01-10") });
    expect(resumirDepreciacion(editado, historial, AHORA).problemas[0].codigo).toBe("HISTORIAL_INCONSISTENTE");
  });

  it("el corte cuenta solo los periodos hasta ese trimestre", () => {
    const registros = planCompleto(activo(), { anio: 2026, trimestre: 4 });
    const alCierreDe3T = resumirDepreciacion(activo(), agregarHistorial(registros, { anio: 2026, trimestre: 3 }), AHORA);
    expect(alCierreDe3T).toMatchObject({ acumuladoCentavos: 50_000, valorNetoCentavos: 350_000, cantidadPeriodos: 2 });
  });
});

describe("estados", () => {
  it("pendiente de depreciación -> en depreciación", () => {
    expect(resumirDepreciacion(activo(), HISTORIAL_VACIO, AHORA).estado).toBe("PENDIENTE_DEPRECIACION");
    const historial = agregarHistorial(planCompleto(activo(), { anio: 2026, trimestre: 2 }));
    expect(resumirDepreciacion(activo(), historial, AHORA)).toMatchObject({
      estado: "EN_DEPRECIACION",
      porcentajeDepreciado: 6.25,
      ultimoPeriodo: { anio: 2026, trimestre: 2 },
    });
  });
});

describe("valor contable y valor actual", () => {
  it("con la depreciación definida son el valor neto", () => {
    expect(valorContableCalculado(resumirDepreciacion(activo(), HISTORIAL_VACIO, AHORA))).toBe(400_000);
    const historial = agregarHistorial(planCompleto(activo(), { anio: 2026, trimestre: 3 }));
    expect(valorContableCalculado(resumirDepreciacion(activo(), historial, AHORA))).toBe(350_000);
  });

  it("totalmente depreciado: S/ 0,00", () => {
    const a = activo({ fechaAdquisicion: new Date("2020-02-01") });
    const historial = agregarHistorial(planCompleto(a, { anio: 2026, trimestre: 4 }));
    expect(valorContableCalculado(resumirDepreciacion(a, historial, AHORA))).toBe(0);
  });

  it.each([
    ["sin fecha", { fechaAdquisicion: null }],
    ["sin costo", { costoAdquisicion: null }],
    ["sin tasa", { tasaAnual: null }],
  ] as const)("%s: no se calcula (sigue siendo manual)", (_, overrides) => {
    expect(valorContableCalculado(resumirDepreciacion(activo(overrides), HISTORIAL_VACIO, AHORA))).toBeNull();
  });
});

describe("montos", () => {
  it("parsea Decimal de Prisma a centavos sin coma flotante", () => {
    expect(parseCentavos("4000")).toBe(400_000);
    expect(parseCentavos("4000.5")).toBe(400_050);
    expect(parseCentavos("0.07")).toBe(7);
    expect(parseCentavos("1.234")).toBeNull();
    expect(parseCentavos(null)).toBeNull();
  });

  it("formatea en soles peruanos", () => {
    expect(formatSoles(400_000)).toBe("S/ 4.000,00");
    expect(formatSoles(123_456_789)).toBe("S/ 1.234.567,89");
    expect(formatSoles(5)).toBe("S/ 0,05");
    expect(formatSoles(null)).toBe("—");
  });
});

describe("módulo general", () => {
  function fila(codigo: string, a: ActivoDepreciable, hasta?: Periodo): FilaDepreciacion {
    const historial = hasta ? agregarHistorial(planCompleto(a, hasta)) : HISTORIAL_VACIO;
    return {
      id: codigo,
      codigoPatrimonial: codigo,
      nombreActivo: codigo,
      tipoActivoCode: "EQUIPOS_INFORMATICOS",
      tipoActivo: "Equipos informáticos",
      fechaAdquisicion: a.fechaAdquisicion,
      dadoDeBaja: false,
      resumen: resumirDepreciacion(a, historial, AHORA),
    };
  }

  it("suma los indicadores solo sobre activos depreciables", () => {
    const totales = calcularTotales([
      fila("A", activo(), { anio: 2026, trimestre: 2 }),
      fila("B", activo({ fechaAdquisicion: new Date("2020-02-01") }), { anio: 2026, trimestre: 4 }),
      fila("C", activo({ fechaAdquisicion: null })),
      fila("D", activo({ tasaAnual: null })),
    ]);
    expect(totales).toEqual({
      activos: 4,
      depreciables: 2,
      costoCentavos: 800_000,
      acumuladoCentavos: 425_000,
      valorNetoCentavos: 375_000,
      totalmenteDepreciados: 1,
      pendientesConfiguracionORevision: 2,
    });
  });

  it("ordena por valor neto en ambos sentidos", () => {
    const filas = [
      fila("A", activo(), { anio: 2026, trimestre: 2 }),
      fila("B", activo({ fechaAdquisicion: new Date("2020-02-01") }), { anio: 2026, trimestre: 4 }),
    ];
    expect(ordenarFilas(filas, "valorNeto", "asc").map((f) => f.id)).toEqual(["B", "A"]);
    expect(ordenarFilas(filas, "valorNeto", "desc").map((f) => f.id)).toEqual(["A", "B"]);
  });

  it("resuelve el corte por año y trimestre", () => {
    expect(resolverCorte("2025", "2", AHORA)).toEqual({ anio: 2025, trimestre: 2 });
    expect(resolverCorte("2025", undefined, AHORA)).toEqual({ anio: 2025, trimestre: 4 });
    expect(resolverCorte(undefined, "1", AHORA)).toEqual({ anio: 2026, trimestre: 1 });
    expect(resolverCorte(undefined, undefined, AHORA)).toBeUndefined();
    expect(resolverCorte("abc", "9", AHORA)).toBeUndefined();
  });
});

describe("procesamiento: permisos y validación", () => {
  it("solo un administrador con sesión puede procesar", () => {
    expect(puedeProcesarDepreciacion("ADMIN")).toBe(true);
    expect(puedeProcesarDepreciacion("SUPER_ADMIN")).toBe(true);
    expect(puedeProcesarDepreciacion(null)).toBe(false);
    expect(puedeProcesarDepreciacion(undefined)).toBe(false);
  });

  it("no acepta trimestres futuros ni valores inválidos", () => {
    expect(validarPeriodoObjetivo({ anio: 2026, trimestre: 4 }, AHORA)).toEqual({ ok: true, periodo: { anio: 2026, trimestre: 4 } });
    expect(validarPeriodoObjetivo({ anio: 2027, trimestre: 1 }, AHORA).ok).toBe(false);
    expect(validarPeriodoObjetivo({ anio: 2026, trimestre: 5 }, AHORA).ok).toBe(false);
    expect(validarPeriodoObjetivo({ anio: "2026'; DROP", trimestre: 1 }, AHORA).ok).toBe(false);
    expect(validarPeriodoObjetivo({ anio: 2026.5, trimestre: 1 }, AHORA).ok).toBe(false);
  });
});

describe("protección del historial", () => {
  const anterior = { costoAdquisicion: "4000", fechaAdquisicion: new Date("2026-05-20"), tipoActivoId: "t1" };

  it("bloquea cambiar costo, fecha o tipo de un activo ya depreciado", () => {
    expect(
      cambiosBloqueadosPorDepreciacion(anterior, {
        costoAdquisicion: 4500,
        fechaAdquisicion: new Date("2026-04-01"),
        tipoActivoId: "t2",
      })
    ).toEqual(["costo de adquisición", "fecha de adquisición", "tipo de activo"]);
    expect(cambiosBloqueadosPorDepreciacion(anterior, { costoAdquisicion: null })).toEqual(["costo de adquisición"]);
  });

  it("permite guardar los mismos valores o no tocarlos", () => {
    expect(
      cambiosBloqueadosPorDepreciacion(anterior, {
        costoAdquisicion: 4000,
        fechaAdquisicion: new Date("2026-05-20"),
        tipoActivoId: "t1",
      })
    ).toEqual([]);
    expect(cambiosBloqueadosPorDepreciacion(anterior, {})).toEqual([]);
  });
});
