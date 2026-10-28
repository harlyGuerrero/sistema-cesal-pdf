import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { Prisma, TipoActivoCode } from "@/lib/generated/prisma/client";
import { resumirDepreciacion, type Periodo } from "@/lib/depreciacion/calculo";
import { cargarHistorialesAgregados, cargarTasasPorTipo, historialDe, toActivoDepreciable } from "@/lib/depreciacion/consultas";
import { cargarDepreciacionActivo } from "@/lib/depreciacion/detalle";
import { procesarTrimestreEn } from "@/lib/depreciacion/procesamiento";
import { assertSinCambiosDepreciables } from "@/lib/depreciacion/proteccion";
import { sincronizarValoresContables } from "@/lib/depreciacion/valores-contables";

// Fase 58: prueba de integración contra la PostgreSQL de desarrollo
// (DATABASE_URL), con la migración fase58 aplicada. Todo corre dentro de
// UNA transacción que se revierte al final: no deja activos, periodos,
// procesamientos ni auditoría en la base. Si la base no responde, se omite
// (las reglas de cálculo igual quedan cubiertas por depreciacion.test.ts).

const AHORA = new Date("2026-10-20T12:00:00Z"); // 4T 2026
const T4_2026: Periodo = { anio: 2026, trimestre: 4 };

class Revertir extends Error {}

async function baseDisponible(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const client = new Client({ connectionString: process.env.DATABASE_URL.replace(/\?schema=.*/, "") });
  try {
    await client.connect();
    await client.query('SELECT 1 FROM "depreciacion_periodos" LIMIT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

const disponible = await baseDisponible();

// Corre `fn` en una transacción y la revierte siempre.
async function enTransaccionRevertida(fn: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        await fn(tx);
        throw new Revertir();
      },
      { timeout: 60_000, maxWait: 10_000 }
    );
  } catch (error) {
    if (!(error instanceof Revertir)) throw error;
  }
}

// Ejecuta una sentencia que debe fallar sin dejar la transacción abortada.
async function esperarRechazo(tx: Prisma.TransactionClient, fn: () => Promise<unknown>): Promise<void> {
  await tx.$executeRaw`SAVEPOINT prueba_rechazo`;
  let fallo = false;
  try {
    await fn();
  } catch {
    fallo = true;
  }
  await tx.$executeRaw`ROLLBACK TO SAVEPOINT prueba_rechazo`;
  expect(fallo).toBe(true);
}

async function crearActivo(
  tx: Prisma.TransactionClient,
  datos: { tipo: TipoActivoCode; costo: string | null; fecha: string | null }
): Promise<string> {
  const tipo = await tx.tipoActivo.findUniqueOrThrow({ where: { code: datos.tipo } });
  const nombre = `Prueba depreciación ${randomUUID().slice(0, 8)}`;
  const activo = await tx.activo.create({
    data: {
      codigoPatrimonial: `TEST-DEP-${randomUUID()}`,
      nombreActivo: nombre,
      nombreNormalizado: nombre.toLowerCase(),
      tipoActivoId: tipo.id,
      costoAdquisicion: datos.costo ?? undefined,
      fechaAdquisicion: datos.fecha ? new Date(datos.fecha) : null,
    },
  });
  return activo.id;
}

async function periodosDe(tx: Prisma.TransactionClient, activoId: string) {
  return tx.depreciacionPeriodo.findMany({ where: { activoId }, orderBy: [{ anio: "asc" }, { trimestre: "asc" }] });
}

describe.skipIf(!disponible)("depreciación contra PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registra, no duplica al reprocesar, completa trimestres faltantes y protege el historial", async () => {
    await enTransaccionRevertida(async (tx) => {
      const informatico = await crearActivo(tx, { tipo: "EQUIPOS_INFORMATICOS", costo: "4000.00", fecha: "2026-05-20" });
      const antiguo = await crearActivo(tx, { tipo: "EQUIPOS_INFORMATICOS", costo: "1000.10", fecha: "2020-02-01" });
      const sinFecha = await crearActivo(tx, { tipo: "MOBILIARIO_Y_ENSERES", costo: "500.00", fecha: null });
      const sinCosto = await crearActivo(tx, { tipo: "EDIFICACIONES", costo: null, fecha: "2025-01-10" });

      // 1) Procesar 2T 2026: el ejemplo de CESAL.
      await procesarTrimestreEn(tx, { anio: 2026, trimestre: 2 }, null, AHORA);
      const [primero] = await periodosDe(tx, informatico);
      expect(primero).toMatchObject({ anio: 2026, trimestre: 2 });
      expect(primero.importeDepreciado.toString()).toBe("250");
      expect(primero.depreciacionAcumulada.toString()).toBe("250");
      expect(primero.valorNeto.toString()).toBe("3750");
      expect(primero.tasaTrimestral.toString()).toBe("6.25");

      // 2) Reprocesar el mismo trimestre: idempotente.
      await procesarTrimestreEn(tx, { anio: 2026, trimestre: 2 }, null, AHORA);
      expect(await periodosDe(tx, informatico)).toHaveLength(1);

      // 3) Procesar 4T 2026: completa 3T y 4T en orden.
      await procesarTrimestreEn(tx, T4_2026, null, AHORA);
      const informaticoPeriodos = await periodosDe(tx, informatico);
      expect(informaticoPeriodos.map((p) => `${p.trimestre}T ${p.anio}`)).toEqual(["2T 2026", "3T 2026", "4T 2026"]);
      expect(informaticoPeriodos.at(-1)!.depreciacionAcumulada.toString()).toBe("750");

      // 4) El activo de 2020 se depreció entero en 16 trimestres; el último
      //    solo por el saldo, y no hay nada después de llegar a S/ 0,00.
      const antiguoPeriodos = await periodosDe(tx, antiguo);
      expect(antiguoPeriodos).toHaveLength(16);
      expect(antiguoPeriodos.at(-1)).toMatchObject({ anio: 2023, trimestre: 4 });
      expect(antiguoPeriodos.at(-1)!.importeDepreciado.toString()).toBe("62.45");
      expect(antiguoPeriodos.at(-1)!.valorNeto.toString()).toBe("0");

      // 5) Sin fecha / sin costo: no se inventa nada.
      expect(await periodosDe(tx, sinFecha)).toHaveLength(0);
      expect(await periodosDe(tx, sinCosto)).toHaveLength(0);

      // 6) Volver a procesar 4T: nada nuevo para estos activos.
      const antes = await tx.depreciacionPeriodo.count({ where: { activoId: { in: [informatico, antiguo] } } });
      await procesarTrimestreEn(tx, T4_2026, null, AHORA);
      expect(await tx.depreciacionPeriodo.count({ where: { activoId: { in: [informatico, antiguo] } } })).toBe(antes);

      // 7) Módulo general (GROUP BY) y detalle (filas) dan el mismo resumen.
      const tasas = await cargarTasasPorTipo(tx);
      const historiales = await cargarHistorialesAgregados(tx);
      for (const id of [informatico, antiguo, sinFecha, sinCosto]) {
        const activo = await tx.activo.findUniqueOrThrow({ where: { id } });
        const general = resumirDepreciacion(toActivoDepreciable(activo, tasas), historialDe(historiales, id), AHORA);
        const detalle = await cargarDepreciacionActivo(tx, id, AHORA);
        expect(detalle!.resumen).toEqual(general);
      }
      const detalleAntiguo = await cargarDepreciacionActivo(tx, antiguo, AHORA);
      expect(detalleAntiguo!.resumen).toMatchObject({ estado: "TOTALMENTE_DEPRECIADO", valorNetoCentavos: 0, costoCentavos: 100_010 });
      expect((await cargarDepreciacionActivo(tx, sinFecha, AHORA))!.resumen.estado).toBe("PENDIENTE_REVISION");

      // 7b) Fase 60: el valor contable y el valor actual quedaron en el valor
      //     neto, guardados por el procesamiento; los activos sin depreciación
      //     definida no se tocaron.
      const valores = async (id: string) => {
        const a = await tx.activo.findUniqueOrThrow({ where: { id } });
        return [a.valorContable?.toString() ?? null, a.valorActual?.toString() ?? null];
      };
      expect(await valores(informatico)).toEqual(["3250", "3250"]);
      expect(await valores(antiguo)).toEqual(["0", "0"]);
      expect(await valores(sinFecha)).toEqual([null, null]);
      expect(await valores(sinCosto)).toEqual([null, null]);
      // Un activo nuevo con depreciación definida pero sin trimestres: su costo.
      const nuevo = await crearActivo(tx, { tipo: "MOBILIARIO_Y_ENSERES", costo: "800.00", fecha: "2026-10-01" });
      expect(await sincronizarValoresContables(tx, [nuevo, sinFecha])).toBe(1);
      expect(await valores(nuevo)).toEqual(["800", "800"]);
      expect(await sincronizarValoresContables(tx, [nuevo])).toBe(0);

      // 8) El costo original no se tocó.
      expect((await tx.activo.findUniqueOrThrow({ where: { id: antiguo } })).costoAdquisicion!.toString()).toBe("1000.1");

      // 9) La base impide duplicar un periodo y valores inválidos.
      const procesamientoId = informaticoPeriodos[0].procesamientoId;
      const fila = {
        activoId: informatico,
        anio: 2026,
        trimestre: 2,
        costoBase: "4000",
        tasaTrimestral: "6.25",
        importeDepreciado: "250",
        depreciacionAcumulada: "250",
        valorNeto: "3750",
        procesamientoId,
      };
      await esperarRechazo(tx, () => tx.depreciacionPeriodo.create({ data: fila }));
      await esperarRechazo(tx, () =>
        tx.depreciacionPeriodo.create({
          data: { ...fila, anio: 2030, depreciacionAcumulada: "4250", valorNeto: "-250" },
        })
      );
      await esperarRechazo(tx, () => tx.depreciacionPeriodo.create({ data: { ...fila, anio: 2030, trimestre: 5 } }));

      // 10) Con historial, no se borra el activo ni se cambia su costo.
      await esperarRechazo(tx, () => tx.activo.delete({ where: { id: informatico } }));
      const anterior = await tx.activo.findUniqueOrThrow({ where: { id: informatico } });
      await expect(assertSinCambiosDepreciables(tx, anterior, { costoAdquisicion: 5000 })).rejects.toThrow(
        /depreciación registrada/
      );
      await expect(assertSinCambiosDepreciables(tx, anterior, { costoAdquisicion: 4000 })).resolves.toBeUndefined();

      // 11) Cada procesamiento quedó trazado y auditado.
      const auditorias = await tx.auditoriaLog.count({ where: { accion: "PROCESAR_DEPRECIACION", entidadId: procesamientoId } });
      expect(auditorias).toBe(1);
    });
  }, 60_000);
});
