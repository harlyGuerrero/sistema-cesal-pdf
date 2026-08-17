import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildReportesWhere, buildReporteMatriz } from "@/lib/activos/reportes";
import { buildReporteWorkbook } from "@/lib/activos/excel-reportes";

export const runtime = "nodejs";

// Fase 43: exporta exactamente lo que muestra /reportes con los filtros
// actuales — la matriz completa (no solo la sede/unidad visible) y TODO el
// detalle de activos (sin la paginación de 30 en 30 de la pantalla), mismo
// criterio que app/api/activos/export/route.ts.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = {
    sedeId: searchParams.get("sedeId") ?? undefined,
    tipoActivoId: searchParams.get("tipoActivoId") ?? undefined,
    estado: searchParams.get("estado") ?? undefined,
  };
  const filterWhere = buildReportesWhere(params);

  const [matriz, detalle, valorContable] = await Promise.all([
    buildReporteMatriz(filterWhere, params),
    prisma.activo.findMany({
      where: filterWhere,
      include: { tipoActivo: true, sede: true, unidadOperativa: true, ambiente: true, responsableActual: true },
      orderBy: { nombreActivo: "asc" },
    }),
    prisma.activo.aggregate({ where: filterWhere, _sum: { valorContable: true } }),
  ]);

  const buffer = await buildReporteWorkbook({
    matriz,
    detalle,
    valorContableTotal: Number(valorContable._sum.valorContable ?? 0),
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
