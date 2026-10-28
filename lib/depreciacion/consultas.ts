import type { EstadoPatrimonial, Prisma } from "@/lib/generated/prisma/client";
import {
  HISTORIAL_VACIO,
  parseCentavos,
  periodoIndex,
  type ActivoDepreciable,
  type HistorialAgregado,
  type Periodo,
  type RegistroDepreciacion,
  type Trimestre,
} from "./calculo";
import { parseTasa } from "./tasas";

// Fase 58: lecturas de depreciación compartidas por el módulo general, el
// detalle del activo y el procesamiento. Reciben el cliente (prisma o un tx)
// para poder correr dentro de la transacción del procesamiento.

type Client = Prisma.TransactionClient;

// Tasa anual vigente por tipoActivoId. Un tipo sin fila o con activa=false
// no aparece: para el motor eso es "configuración pendiente".
export async function cargarTasasPorTipo(client: Client): Promise<Map<string, string>> {
  const tasas = await client.tasaDepreciacion.findMany({ where: { activa: true } });
  return new Map(tasas.map((tasa) => [tasa.tipoActivoId, tasa.tasaAnual.toString()]));
}

export function toActivoDepreciable(
  activo: {
    tipoActivoId: string;
    costoAdquisicion: { toString(): string } | null;
    fechaAdquisicion: Date | null;
    estadoPatrimonial: EstadoPatrimonial;
    fechaBaja?: Date | null;
  },
  tasas: Map<string, string>
): ActivoDepreciable {
  return {
    costoAdquisicion: activo.costoAdquisicion?.toString() ?? null,
    fechaAdquisicion: activo.fechaAdquisicion,
    estadoPatrimonial: activo.estadoPatrimonial,
    fechaBaja: activo.fechaBaja ?? null,
    tasaAnual: tasas.get(activo.tipoActivoId) ?? null,
  };
}

export function toRegistroDepreciacion(fila: {
  anio: number;
  trimestre: number;
  costoBase: { toString(): string };
  tasaTrimestral: { toString(): string };
  importeDepreciado: { toString(): string };
  depreciacionAcumulada: { toString(): string };
  valorNeto: { toString(): string };
}): RegistroDepreciacion {
  return {
    anio: fila.anio,
    trimestre: fila.trimestre as Trimestre,
    costoBaseCentavos: parseCentavos(fila.costoBase)!,
    tasaTrimestral: parseTasa(fila.tasaTrimestral)!,
    importeCentavos: parseCentavos(fila.importeDepreciado)!,
    acumuladoCentavos: parseCentavos(fila.depreciacionAcumulada)!,
    valorNetoCentavos: parseCentavos(fila.valorNeto)!,
  };
}

interface FilaHistorial {
  activoId: string;
  cantidad: number;
  suma: string;
  primer: number;
  ultimo: number;
  ultimoAcumulado: string;
  ultimoValorNeto: string;
  costoMin: string;
  costoMax: string;
}

// Historial agregado de todos los activos con depreciación registrada (los
// que no tienen ninguna fila no aparecen: usar HISTORIAL_VACIO). Mismos
// campos que agregarHistorial() arma desde las filas en el detalle. Montos
// como texto para no pasar por coma flotante.
export async function cargarHistorialesAgregados(
  client: Client,
  opciones: { corte?: Periodo; activoIds?: string[] } = {}
): Promise<Map<string, HistorialAgregado>> {
  const corteIndex = opciones.corte ? periodoIndex(opciones.corte) : 2_147_483_647;
  const filas = opciones.activoIds
    ? await client.$queryRaw<FilaHistorial[]>`
        SELECT "activoId",
          count(*)::int AS cantidad,
          sum("importeDepreciado")::text AS suma,
          min("anio" * 4 + "trimestre" - 1)::int AS primer,
          max("anio" * 4 + "trimestre" - 1)::int AS ultimo,
          (array_agg("depreciacionAcumulada"::text ORDER BY "anio" DESC, "trimestre" DESC))[1] AS "ultimoAcumulado",
          (array_agg("valorNeto"::text ORDER BY "anio" DESC, "trimestre" DESC))[1] AS "ultimoValorNeto",
          min("costoBase")::text AS "costoMin",
          max("costoBase")::text AS "costoMax"
        FROM "depreciacion_periodos"
        WHERE "anio" * 4 + "trimestre" - 1 <= ${corteIndex}::int AND "activoId" = ANY(${opciones.activoIds}::text[])
        GROUP BY "activoId"`
    : await client.$queryRaw<FilaHistorial[]>`
        SELECT "activoId",
          count(*)::int AS cantidad,
          sum("importeDepreciado")::text AS suma,
          min("anio" * 4 + "trimestre" - 1)::int AS primer,
          max("anio" * 4 + "trimestre" - 1)::int AS ultimo,
          (array_agg("depreciacionAcumulada"::text ORDER BY "anio" DESC, "trimestre" DESC))[1] AS "ultimoAcumulado",
          (array_agg("valorNeto"::text ORDER BY "anio" DESC, "trimestre" DESC))[1] AS "ultimoValorNeto",
          min("costoBase")::text AS "costoMin",
          max("costoBase")::text AS "costoMax"
        FROM "depreciacion_periodos"
        WHERE "anio" * 4 + "trimestre" - 1 <= ${corteIndex}::int
        GROUP BY "activoId"`;

  return new Map(
    filas.map((fila) => [
      fila.activoId,
      {
        cantidad: fila.cantidad,
        sumaImportesCentavos: parseCentavos(fila.suma)!,
        primerIndex: fila.primer,
        ultimoIndex: fila.ultimo,
        ultimoAcumuladoCentavos: parseCentavos(fila.ultimoAcumulado)!,
        ultimoValorNetoCentavos: parseCentavos(fila.ultimoValorNeto)!,
        costoBaseMinCentavos: parseCentavos(fila.costoMin)!,
        costoBaseMaxCentavos: parseCentavos(fila.costoMax)!,
      },
    ])
  );
}

export function historialDe(historiales: Map<string, HistorialAgregado>, activoId: string): HistorialAgregado {
  return historiales.get(activoId) ?? HISTORIAL_VACIO;
}
