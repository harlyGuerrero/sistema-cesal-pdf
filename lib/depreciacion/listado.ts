import type { Prisma, TipoActivoCode } from "@/lib/generated/prisma/client";
import {
  finDePeriodo,
  periodoActual,
  resumirDepreciacion,
  type EstadoDepreciacion,
  type Periodo,
  type ResumenDepreciacion,
  type Trimestre,
} from "./calculo";
import { cargarHistorialesAgregados, cargarTasasPorTipo, historialDe, toActivoDepreciable } from "./consultas";
import { ESTADO_DEPRECIACION_META } from "./labels";

// Fase 58: datos del módulo general /depreciacion. El estado de cada activo
// se deriva de sus datos + historial (no es una columna), así que filtrar y
// ordenar por estado, acumulado o valor neto se hace en memoria sobre el
// conjunto ya filtrado por texto/tipo en la base. Se leen solo las columnas
// necesarias y el historial llega agregado (una fila por activo), lo que
// alcanza holgado para el tamaño de inventario de CESAL; si algún día
// fueran decenas de miles de activos, esto pasa a una vista SQL.

export interface FiltrosDepreciacion {
  q?: string;
  tipoActivoId?: string;
  estado?: string;
  anio?: string;
  trimestre?: string;
  sort?: string;
  dir?: string;
}

export const COLUMNAS_ORDENABLES = [
  "codigo",
  "nombre",
  "tipo",
  "fecha",
  "costo",
  "acumulado",
  "valorNeto",
  "estado",
] as const;
export type ColumnaOrdenable = (typeof COLUMNAS_ORDENABLES)[number];

export interface FilaDepreciacion {
  id: string;
  codigoPatrimonial: string;
  nombreActivo: string;
  tipoActivoCode: TipoActivoCode;
  tipoActivo: string;
  fechaAdquisicion: Date | null;
  dadoDeBaja: boolean;
  resumen: ResumenDepreciacion;
}

export interface TotalesDepreciacion {
  activos: number;
  depreciables: number;
  costoCentavos: number;
  acumuladoCentavos: number;
  valorNetoCentavos: number;
  totalmenteDepreciados: number;
  pendientesConfiguracionORevision: number;
}

// anio + trimestre -> ese trimestre; solo anio -> cierre del año; solo
// trimestre -> ese trimestre del año en curso. Sin ninguno: situación actual
// (todo lo registrado).
export function resolverCorte(anio?: string, trimestre?: string, ahora: Date = new Date()): Periodo | undefined {
  const anioNum = anio ? Number(anio) : NaN;
  const trimestreNum = trimestre ? Number(trimestre) : NaN;
  const trimestreValido = Number.isInteger(trimestreNum) && trimestreNum >= 1 && trimestreNum <= 4;
  const anioValido = Number.isInteger(anioNum) && anioNum >= 1900 && anioNum <= 2999;
  if (!anioValido && !trimestreValido) return undefined;
  return {
    anio: anioValido ? anioNum : periodoActual(ahora).anio,
    trimestre: (trimestreValido ? trimestreNum : 4) as Trimestre,
  };
}

const ORDEN_ESTADO: Record<EstadoDepreciacion, number> = {
  PENDIENTE_REVISION: 0,
  CONFIGURACION_PENDIENTE: 1,
  PENDIENTE_DEPRECIACION: 2,
  EN_DEPRECIACION: 3,
  TOTALMENTE_DEPRECIADO: 4,
};

function valorOrden(fila: FilaDepreciacion, columna: ColumnaOrdenable): string | number {
  switch (columna) {
    case "codigo":
      return fila.codigoPatrimonial;
    case "nombre":
      return fila.nombreActivo.toLowerCase();
    case "tipo":
      return fila.tipoActivo;
    case "fecha":
      return fila.fechaAdquisicion?.getTime() ?? -Infinity;
    case "costo":
      return fila.resumen.costoCentavos ?? -1;
    case "acumulado":
      return fila.resumen.acumuladoCentavos;
    case "valorNeto":
      return fila.resumen.valorNetoCentavos ?? -1;
    case "estado":
      return ORDEN_ESTADO[fila.resumen.estado];
  }
}

export function ordenarFilas(filas: FilaDepreciacion[], sort?: string, dir?: string): FilaDepreciacion[] {
  const columna = (COLUMNAS_ORDENABLES as readonly string[]).includes(sort ?? "") ? (sort as ColumnaOrdenable) : "codigo";
  const factor = dir === "desc" ? -1 : 1;
  return [...filas].sort((a, b) => {
    const va = valorOrden(a, columna);
    const vb = valorOrden(b, columna);
    const cmp = typeof va === "string" && typeof vb === "string" ? va.localeCompare(vb, "es") : (va as number) - (vb as number);
    return cmp !== 0 ? cmp * factor : a.codigoPatrimonial.localeCompare(b.codigoPatrimonial);
  });
}

export function calcularTotales(filas: FilaDepreciacion[]): TotalesDepreciacion {
  const totales: TotalesDepreciacion = {
    activos: filas.length,
    depreciables: 0,
    costoCentavos: 0,
    acumuladoCentavos: 0,
    valorNetoCentavos: 0,
    totalmenteDepreciados: 0,
    pendientesConfiguracionORevision: 0,
  };
  for (const { resumen } of filas) {
    if (resumen.estado === "PENDIENTE_REVISION" || resumen.estado === "CONFIGURACION_PENDIENTE") {
      totales.pendientesConfiguracionORevision++;
      continue;
    }
    // Depreciables = activos con costo, fecha y tasa válidos (incluye los ya
    // totalmente depreciados: siguen en el patrimonio con valor neto 0).
    totales.depreciables++;
    totales.costoCentavos += resumen.costoCentavos ?? 0;
    totales.acumuladoCentavos += resumen.acumuladoCentavos;
    totales.valorNetoCentavos += resumen.valorNetoCentavos ?? 0;
    if (resumen.estado === "TOTALMENTE_DEPRECIADO") totales.totalmenteDepreciados++;
  }
  return totales;
}

export async function cargarSituacionDepreciacion(
  client: Prisma.TransactionClient,
  filtros: FiltrosDepreciacion,
  ahora: Date = new Date()
): Promise<{ filas: FilaDepreciacion[]; totales: TotalesDepreciacion; corte: Periodo | undefined }> {
  const corte = resolverCorte(filtros.anio, filtros.trimestre, ahora);
  const q = filtros.q?.trim();

  const condiciones: Prisma.ActivoWhereInput[] = [];
  if (q) {
    condiciones.push({
      OR: [
        { nombreNormalizado: { contains: q, mode: "insensitive" } },
        { nombreActivo: { contains: q, mode: "insensitive" } },
        { codigoPatrimonial: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (filtros.tipoActivoId && filtros.tipoActivoId !== "all") {
    condiciones.push({ tipoActivoId: filtros.tipoActivoId });
  }
  // Con corte, los activos comprados después de ese trimestre todavía no
  // existían; los que no tienen fecha se mantienen (pendientes de revisión).
  if (corte) {
    condiciones.push({ OR: [{ fechaAdquisicion: null }, { fechaAdquisicion: { lte: finDePeriodo(corte) } }] });
  }

  const [activos, tasas, historiales] = await Promise.all([
    client.activo.findMany({
      where: { AND: condiciones },
      select: {
        id: true,
        codigoPatrimonial: true,
        nombreActivo: true,
        tipoActivoId: true,
        tipoActivo: { select: { code: true, name: true } },
        costoAdquisicion: true,
        fechaAdquisicion: true,
        estadoPatrimonial: true,
      },
    }),
    cargarTasasPorTipo(client),
    cargarHistorialesAgregados(client, { corte }),
  ]);

  let filas: FilaDepreciacion[] = activos.map((activo) => ({
    id: activo.id,
    codigoPatrimonial: activo.codigoPatrimonial,
    nombreActivo: activo.nombreActivo,
    tipoActivoCode: activo.tipoActivo.code,
    tipoActivo: activo.tipoActivo.name,
    fechaAdquisicion: activo.fechaAdquisicion,
    dadoDeBaja: activo.estadoPatrimonial === "BAJA",
    resumen: resumirDepreciacion(toActivoDepreciable(activo, tasas), historialDe(historiales, activo.id), ahora),
  }));

  if (filtros.estado && filtros.estado in ESTADO_DEPRECIACION_META) {
    filas = filas.filter((fila) => fila.resumen.estado === filtros.estado);
  }

  return { filas: ordenarFilas(filas, filtros.sort, filtros.dir), totales: calcularTotales(filas), corte };
}
