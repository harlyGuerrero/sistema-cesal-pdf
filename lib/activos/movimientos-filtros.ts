import type { Prisma, TipoMovimiento } from "@/lib/generated/prisma/client";

export interface MovimientosFiltrosParams {
  tipo?: string;
  sedeId?: string;
  unidadOperativaId?: string;
  q?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

// Fase 45: extraído de app/(app)/movimientos/page.tsx para que la
// exportación a Excel (app/api/movimientos/export/route.ts) filtre
// exactamente igual que la pantalla — mismo criterio que
// lib/activos/filtros.ts y lib/activos/reportes.ts.
export function buildMovimientosWhere(params: MovimientosFiltrosParams): Prisma.MovimientoWhereInput {
  const { tipo, sedeId, unidadOperativaId, q, fechaDesde, fechaHasta } = params;
  const filtros: Prisma.MovimientoWhereInput[] = [];

  if (tipo && tipo !== "all") filtros.push({ tipo: tipo as TipoMovimiento });
  if (sedeId && sedeId !== "all") {
    filtros.push({ OR: [{ sedeAnteriorId: sedeId }, { sedeNuevaId: sedeId }] });
  }
  if (unidadOperativaId && unidadOperativaId !== "all") {
    filtros.push({
      OR: [{ unidadOperativaAnteriorId: unidadOperativaId }, { unidadOperativaNuevaId: unidadOperativaId }],
    });
  }
  if (q) {
    filtros.push({
      activo: {
        OR: [
          { nombreActivo: { contains: q, mode: "insensitive" } },
          { codigoPatrimonial: { contains: q, mode: "insensitive" } },
        ],
      },
    });
  }
  if (fechaDesde) filtros.push({ fecha: { gte: new Date(`${fechaDesde}T00:00:00`) } });
  if (fechaHasta) filtros.push({ fecha: { lte: new Date(`${fechaHasta}T23:59:59`) } });

  return filtros.length > 0 ? { AND: filtros } : {};
}
