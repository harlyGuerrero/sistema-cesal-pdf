import { prisma } from "@/lib/db";
import { TIPO_ACTIVO_CODE_ORDER } from "./labels";
import type { EstadoPatrimonial, Prisma, TipoActivoCode } from "@/lib/generated/prisma/client";

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

const SIN_UBICACION = "__none__";

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
