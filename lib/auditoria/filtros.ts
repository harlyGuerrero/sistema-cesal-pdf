import type { Prisma, TipoAccionAuditoria } from "@/lib/generated/prisma/client";

export interface AuditoriaFiltrosParams {
  q?: string;
  entidad?: string;
  accion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

// Fase 45: extraído de app/(app)/auditoria/page.tsx para que la exportación
// a Excel (app/api/auditoria/export/route.ts) filtre exactamente igual que
// la pantalla — mismo criterio que lib/activos/filtros.ts.
export function buildAuditoriaWhere(params: AuditoriaFiltrosParams): Prisma.AuditoriaLogWhereInput {
  const { q, entidad, accion, fechaDesde, fechaHasta } = params;
  const filtros: Prisma.AuditoriaLogWhereInput[] = [];

  if (q) {
    filtros.push({
      usuario: {
        OR: [
          { nombres: { contains: q, mode: "insensitive" } },
          { apellidos: { contains: q, mode: "insensitive" } },
        ],
      },
    });
  }
  if (entidad && entidad !== "all") filtros.push({ entidad });
  if (accion && accion !== "all") filtros.push({ accion: accion as TipoAccionAuditoria });
  if (fechaDesde) filtros.push({ fecha: { gte: new Date(`${fechaDesde}T00:00:00`) } });
  if (fechaHasta) filtros.push({ fecha: { lte: new Date(`${fechaHasta}T23:59:59`) } });

  return filtros.length > 0 ? { AND: filtros } : {};
}
