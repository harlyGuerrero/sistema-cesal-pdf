import { prisma } from "@/lib/db";
import { TIPO_ACTIVO_CODE_ORDER } from "./labels";
import type { EstadoPatrimonial, Prisma, TipoActivoCode } from "@/lib/generated/prisma/client";
import { resumirDepreciacion } from "@/lib/depreciacion/calculo";
import {
  cargarHistorialesAgregados,
  cargarTasasPorTipo,
  historialDe,
  toActivoDepreciable,
} from "@/lib/depreciacion/consultas";

// Fase 43: extraído de app/(app)/reportes/page.tsx para que la exportación a
// Excel (app/api/reportes/export/route.ts) construya exactamente la misma
// matriz sede/unidad-operativa x tipo que ve el usuario en pantalla, en vez
// de una copia divergente de la misma lógica (mismo criterio que
// lib/activos/filtros.ts para /activos).

export interface ReportesFiltrosParams {
  sedeId?: string;
  tipoActivoId?: string;
  estado?: string;
}

export function buildReportesWhere(params: ReportesFiltrosParams): Prisma.ActivoWhereInput {
  const { sedeId, tipoActivoId, estado } = params;
  return {
    ...(sedeId && sedeId !== "all" ? { sedeId } : {}),
    ...(tipoActivoId && tipoActivoId !== "all" ? { tipoActivoId } : {}),
    ...(estado && estado !== "all" ? { estadoPatrimonial: estado as EstadoPatrimonial } : {}),
  };
}

export const SIN_UBICACION = "__none__";

export interface FilaMatriz {
  key: string;
  label: string;
  counts: number[];
  total: number;
}

export interface ReporteMatriz {
  columnas: { id: string; name: string; code: TipoActivoCode }[];
  filas: FilaMatriz[];
  totalesPorColumna: number[];
  totalGeneral: number;
  sedeSeleccionada: { id: string; name: string } | undefined;
}

// Sin sede elegida agrupa por Sede; con una sede elegida "entra" un nivel y
// agrupa por Unidad Operativa dentro de ella (mismo drill-down que el resto
// del sistema, ver Fase 5). `filterWhere` ya debe incluir sedeId si aplica
// (viene de buildReportesWhere) — acá solo se usa `params.sedeId` para
// decidir el modo de agrupación, no para filtrar de nuevo.
export async function buildReporteMatriz(
  filterWhere: Prisma.ActivoWhereInput,
  params: ReportesFiltrosParams
): Promise<ReporteMatriz> {
  const [sedes, tiposActivo] = await Promise.all([
    prisma.sede.findMany({ orderBy: { name: "asc" } }),
    prisma.tipoActivo.findMany(),
  ]);
  const tipoActivoByCode = new Map(tiposActivo.map((tipo) => [tipo.code, tipo]));
  const columnas = TIPO_ACTIVO_CODE_ORDER.map((code) => tipoActivoByCode.get(code)).filter(
    (tipo): tipo is NonNullable<typeof tipo> => tipo != null
  );

  const sedeSeleccionada = params.sedeId && params.sedeId !== "all" ? sedes.find((s) => s.id === params.sedeId) : undefined;

  const [matrizGrupos, unidadesDeSede] = await Promise.all([
    sedeSeleccionada
      ? prisma.activo.groupBy({
          by: ["unidadOperativaId", "tipoActivoId"],
          where: { ...filterWhere, sedeId: sedeSeleccionada.id },
          _count: true,
        })
      : prisma.activo.groupBy({
          by: ["sedeId", "tipoActivoId"],
          where: filterWhere,
          _count: true,
        }),
    sedeSeleccionada
      ? prisma.unidadOperativa.findMany({ where: { sedeId: sedeSeleccionada.id }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  // rowKey usa SIN_UBICACION en vez de null porque los valores de un Map se
  // comparan por identidad, no por null === null.
  const conteoPorFila = new Map<string, Map<string, number>>();
  for (const grupo of matrizGrupos) {
    const rowKey = sedeSeleccionada
      ? ((grupo as { unidadOperativaId: string | null }).unidadOperativaId ?? SIN_UBICACION)
      : ((grupo as { sedeId: string | null }).sedeId ?? SIN_UBICACION);
    if (!conteoPorFila.has(rowKey)) conteoPorFila.set(rowKey, new Map());
    conteoPorFila.get(rowKey)!.set(grupo.tipoActivoId, grupo._count);
  }

  const filasBase: { key: string; label: string }[] = sedeSeleccionada
    ? unidadesDeSede.map((u) => ({ key: u.id, label: u.name }))
    : sedes.map((s) => ({ key: s.id, label: s.name }));
  if (conteoPorFila.has(SIN_UBICACION)) {
    filasBase.push({ key: SIN_UBICACION, label: sedeSeleccionada ? "Sin unidad operativa" : "Sin sede" });
  }

  const filas: FilaMatriz[] = filasBase.map((fila) => {
    const porTipo = conteoPorFila.get(fila.key) ?? new Map<string, number>();
    const counts = columnas.map((tipo) => porTipo.get(tipo.id) ?? 0);
    return { ...fila, counts, total: counts.reduce((a, b) => a + b, 0) };
  });

  const totalesPorColumna = columnas.map((_, i) => filas.reduce((sum, fila) => sum + fila.counts[i], 0));
  const totalGeneral = totalesPorColumna.reduce((a, b) => a + b, 0);

  return {
    columnas: columnas.map((c) => ({ id: c.id, name: c.name, code: c.code })),
    filas,
    totalesPorColumna,
    totalGeneral,
    sedeSeleccionada: sedeSeleccionada ? { id: sedeSeleccionada.id, name: sedeSeleccionada.name } : undefined,
  };
}

// ---------------------------------------------------------------------------
// Fase 59: celda elegida y montos
// ---------------------------------------------------------------------------

// Una celda de la matriz como filtro del desglose: `fila` es la sede (o la
// unidad operativa, con una sede elegida; SIN_UBICACION para "Sin sede"/"Sin
// unidad") y `col` el tipo de activo. Cualquiera de las dos puede faltar:
// solo fila = total de esa fila, solo col = total de esa columna.
export interface CeldaReporte {
  fila?: string;
  col?: string;
}

export function buildCeldaWhere(celda: CeldaReporte, porUnidadOperativa: boolean): Prisma.ActivoWhereInput {
  const where: Prisma.ActivoWhereInput = {};
  if (celda.fila) {
    const valor = celda.fila === SIN_UBICACION ? null : celda.fila;
    if (porUnidadOperativa) where.unidadOperativaId = valor;
    else where.sedeId = valor;
  }
  if (celda.col) where.tipoActivoId = celda.col;
  return where;
}

export interface MontosReporte {
  // Por activo, para el desglose. null = sin costo válido.
  porActivo: Map<string, { costoCentavos: number | null; valorNetoCentavos: number | null }>;
  // Por fila de la matriz (misma clave que FilaMatriz.key).
  porFila: Map<string, { costoCentavos: number; valorNetoCentavos: number }>;
  costoCentavos: number;
  valorNetoCentavos: number;
  // Activos que no suman a los montos por no tener un costo válido.
  sinCosto: number;
}

// Costo de adquisición y valor neto contable con el mismo motor que el
// módulo de Depreciación (resumirDepreciacion): valor neto = costo menos la
// depreciación registrada. Un activo sin costo válido no suma a ninguno de
// los dos y se cuenta aparte, para decirlo en el reporte en vez de
// esconderlo.
export async function cargarMontosReporte(
  filterWhere: Prisma.ActivoWhereInput,
  porUnidadOperativa: boolean
): Promise<MontosReporte> {
  const [activos, tasas, historiales] = await Promise.all([
    prisma.activo.findMany({
      where: filterWhere,
      select: {
        id: true,
        sedeId: true,
        unidadOperativaId: true,
        tipoActivoId: true,
        costoAdquisicion: true,
        fechaAdquisicion: true,
        estadoPatrimonial: true,
      },
    }),
    cargarTasasPorTipo(prisma),
    cargarHistorialesAgregados(prisma),
  ]);

  const montos: MontosReporte = { porActivo: new Map(), porFila: new Map(), costoCentavos: 0, valorNetoCentavos: 0, sinCosto: 0 };
  for (const activo of activos) {
    const resumen = resumirDepreciacion(toActivoDepreciable(activo, tasas), historialDe(historiales, activo.id));
    montos.porActivo.set(activo.id, { costoCentavos: resumen.costoCentavos, valorNetoCentavos: resumen.valorNetoCentavos });
    if (resumen.costoCentavos === null) {
      montos.sinCosto++;
      continue;
    }
    const valorNeto = resumen.valorNetoCentavos ?? 0;
    const key = (porUnidadOperativa ? activo.unidadOperativaId : activo.sedeId) ?? SIN_UBICACION;
    const fila = montos.porFila.get(key) ?? { costoCentavos: 0, valorNetoCentavos: 0 };
    fila.costoCentavos += resumen.costoCentavos;
    fila.valorNetoCentavos += valorNeto;
    montos.porFila.set(key, fila);
    montos.costoCentavos += resumen.costoCentavos;
    montos.valorNetoCentavos += valorNeto;
  }
  return montos;
}

// Último trimestre procesado en Depreciación: hasta dónde está calculado el
// valor neto que muestra el reporte.
export async function ultimoTrimestreDepreciado(): Promise<{ anio: number; trimestre: number } | null> {
  return prisma.depreciacionPeriodo.findFirst({
    orderBy: [{ anio: "desc" }, { trimestre: "desc" }],
    select: { anio: true, trimestre: true },
  });
}

// Textos del reporte que comparten la pantalla, la impresión y el Excel.
export function tituloSeleccion(
  matriz: Pick<ReporteMatriz, "filas" | "sedeSeleccionada">,
  tipos: Map<string, { name: string }>,
  celda: CeldaReporte
): string {
  if (!celda.fila && !celda.col) return "Todos los activos del reporte";
  const tipo = celda.col ? (tipos.get(celda.col)?.name ?? "Un tipo") : "Todos los tipos";
  const lugar = celda.fila
    ? (matriz.filas.find((f) => f.key === celda.fila)?.label ?? "una ubicación")
    : matriz.sedeSeleccionada
      ? `todo ${matriz.sedeSeleccionada.name}`
      : "todas las sedes";
  return `${tipo} en ${lugar}`;
}

export function filtrosLegibles(
  matriz: Pick<ReporteMatriz, "sedeSeleccionada">,
  tipos: Map<string, { name: string }>,
  params: ReportesFiltrosParams,
  estadoLabels: Record<string, string>
): string {
  return [
    matriz.sedeSeleccionada ? `Sede ${matriz.sedeSeleccionada.name}` : "Todas las sedes",
    params.tipoActivoId && params.tipoActivoId !== "all" ? (tipos.get(params.tipoActivoId)?.name ?? "Un tipo") : "Todos los tipos",
    params.estado && params.estado !== "all" ? `Estado ${estadoLabels[params.estado] ?? params.estado}` : "Todos los estados",
  ].join(" · ");
}
