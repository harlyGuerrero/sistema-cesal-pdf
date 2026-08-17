import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildMovimientosWhere } from "@/lib/activos/movimientos-filtros";
import { buildMovimientosWorkbook } from "@/lib/activos/excel-movimientos";

export const runtime = "nodejs";

// Fase 45: exporta TODOS los movimientos que matchean los filtros actuales
// de /movimientos (no solo la página visible) — mismo criterio que
// app/api/activos/export/route.ts.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where = buildMovimientosWhere({
    tipo: searchParams.get("tipo") ?? undefined,
    sedeId: searchParams.get("sedeId") ?? undefined,
    unidadOperativaId: searchParams.get("unidadOperativaId") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    fechaDesde: searchParams.get("fechaDesde") ?? undefined,
    fechaHasta: searchParams.get("fechaHasta") ?? undefined,
  });

  const movimientos = await prisma.movimiento.findMany({
    where,
    include: {
      activo: { select: { nombreActivo: true, codigoPatrimonial: true } },
      usuario: true,
      responsableAnterior: true,
      responsableNuevo: true,
      sedeAnterior: true,
      sedeNueva: true,
      unidadOperativaAnterior: true,
      unidadOperativaNueva: true,
      ambienteAnterior: true,
      ambienteNuevo: true,
    },
    orderBy: { fecha: "desc" },
  });

  const buffer = await buildMovimientosWorkbook(movimientos);
  const fecha = new Date().toISOString().slice(0, 10);

  // Cast: exceljs declara su propio `Buffer` global incompatible con
  // @types/node (ver lib/activos/excel-import.ts) — en runtime es un Buffer
  // real, válido como BodyInit.
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="movimientos-${fecha}.xlsx"`,
    },
  });
}
