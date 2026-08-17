import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildAuditoriaWhere } from "@/lib/auditoria/filtros";
import { buildAuditoriaWorkbook } from "@/lib/auditoria/excel-auditoria";

export const runtime = "nodejs";

// Fase 45: exporta TODOS los registros de auditoría que matchean los
// filtros actuales de /auditoria (no solo la página visible) — mismo
// criterio que app/api/activos/export/route.ts.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where = buildAuditoriaWhere({
    q: searchParams.get("q") ?? undefined,
    entidad: searchParams.get("entidad") ?? undefined,
    accion: searchParams.get("accion") ?? undefined,
    fechaDesde: searchParams.get("fechaDesde") ?? undefined,
    fechaHasta: searchParams.get("fechaHasta") ?? undefined,
  });

  const logs = await prisma.auditoriaLog.findMany({
    where,
    include: { usuario: true },
    orderBy: { fecha: "desc" },
  });

  const buffer = await buildAuditoriaWorkbook(logs);
  const fecha = new Date().toISOString().slice(0, 10);

  // Cast: exceljs declara su propio `Buffer` global incompatible con
  // @types/node (ver lib/activos/excel-import.ts) — en runtime es un Buffer
  // real, válido como BodyInit.
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="auditoria-${fecha}.xlsx"`,
    },
  });
}
