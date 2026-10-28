import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUsuario } from "@/lib/auth/session";
import { ESTADO_PATRIMONIAL_LABELS } from "@/lib/activos/labels";
import { formatPeriodo } from "@/lib/depreciacion/calculo";
import {
  buildCeldaWhere,
  buildReporteMatriz,
  buildReportesWhere,
  cargarMontosReporte,
  filtrosLegibles,
  tituloSeleccion,
  ultimoTrimestreDepreciado,
} from "@/lib/activos/reportes";
import { buildReporteWorkbook } from "@/lib/activos/excel-reportes";

export const runtime = "nodejs";

// Fase 43, ampliada en Fase 59: exporta exactamente lo que muestra
// /reportes con los filtros actuales — la matriz completa con su costo y
// valor neto, y el desglose de la celda elegida (o de todo) sin la
// paginación de 30 en 30 de la pantalla, mismo criterio que
// app/api/activos/export/route.ts.
export async function GET(request: Request) {
  const usuario = await requireSessionUsuario();
  const { searchParams } = new URL(request.url);
  const params = {
    sedeId: searchParams.get("sedeId") ?? undefined,
    tipoActivoId: searchParams.get("tipoActivoId") ?? undefined,
    estado: searchParams.get("estado") ?? undefined,
  };
  const celda = { fila: searchParams.get("fila") ?? undefined, col: searchParams.get("col") ?? undefined };
  const porUnidad = Boolean(params.sedeId && params.sedeId !== "all");
  const filterWhere = buildReportesWhere(params);

  const [matriz, montos, detalle, tiposActivo, corte] = await Promise.all([
    buildReporteMatriz(filterWhere, params),
    cargarMontosReporte(filterWhere, porUnidad),
    prisma.activo.findMany({
      where: { AND: [filterWhere, buildCeldaWhere(celda, porUnidad)] },
      include: { tipoActivo: true, sede: true, unidadOperativa: true, ambiente: true, responsableActual: true },
      orderBy: { nombreActivo: "asc" },
    }),
    prisma.tipoActivo.findMany(),
    ultimoTrimestreDepreciado(),
  ]);
  const tipos = new Map(tiposActivo.map((tipo) => [tipo.id, tipo]));

  const buffer = await buildReporteWorkbook({
    matriz,
    montos,
    detalle,
    tituloDesglose: tituloSeleccion(matriz, tipos, celda),
    filtros: filtrosLegibles(matriz, tipos, params, ESTADO_PATRIMONIAL_LABELS),
    corte: corte ? formatPeriodo(corte) : null,
    generadoPor: usuario.nombre,
  });
  const fecha = new Date().toISOString().slice(0, 10);

  // Cast: exceljs declara su propio `Buffer` global incompatible con
  // @types/node (ver lib/activos/excel-import.ts) — en runtime es un Buffer
  // real, válido como BodyInit.
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-activos-${fecha}.xlsx"`,
    },
  });
}
