import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildActivosWhere } from "@/lib/activos/filtros";
import { buildActivosWorkbook } from "@/lib/activos/excel-export";

export const runtime = "nodejs";

// Fase 40: exporta TODOS los activos que matchean los filtros actuales de
// /activos (no solo la página visible) — reusa buildActivosWhere para que
// "lo que exportas" sea exactamente "lo que estás viendo filtrado", nunca
// una copia divergente del criterio de filtrado.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where = buildActivosWhere({
    q: searchParams.get("q") ?? undefined,
    tipoActivoId: searchParams.get("tipoActivoId") ?? undefined,
    sedeId: searchParams.get("sedeId") ?? undefined,
    estadoPatrimonial: searchParams.get("estadoPatrimonial") ?? undefined,
  });

  const activos = await prisma.activo.findMany({
    where,
    include: { tipoActivo: true, sede: true, unidadOperativa: true, ambiente: true, proveedor: true },
    orderBy: { nombreActivo: "asc" },
  });

  const buffer = await buildActivosWorkbook(activos);
  const fecha = new Date().toISOString().slice(0, 10);

  // Cast: exceljs declara su propio `Buffer` global incompatible con
  // @types/node (ver excel-import.ts) — en runtime es un Buffer real, válido
  // como BodyInit.
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="activos-${fecha}.xlsx"`,
    },
  });
}
