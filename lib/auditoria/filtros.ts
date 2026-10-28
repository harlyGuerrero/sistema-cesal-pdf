import type { Prisma, TipoAccionAuditoria } from "@/lib/generated/prisma/client";

export interface AuditoriaFiltrosParams {
  q?: string;
  entidad?: string;
  accion?: string;
  usuarioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

// Claves de `detalle` que nombran aquello sobre lo que se actuó (ver
// lib/auditoria/narrativa.ts): el buscador mira ahí además del usuario.
const CLAVES_BUSCABLES = ["nombreActivo", "activoNombre", "codigoPatrimonial", "nombre", "nombreOriginal", "responsable"];

// Fase 45: extraído de app/(app)/auditoria/page.tsx para que la exportación
// a Excel (app/api/auditoria/export/route.ts) filtre exactamente igual que
// la pantalla — mismo criterio que lib/activos/filtros.ts.
// Fase 59: el buscador ya no busca solo por nombre de usuario — también por
// activo, código patrimonial o nombre del registro. Los filtros de JSON de
// Postgres distinguen mayúsculas, así que se prueba el texto tal cual, en
// mayúsculas (códigos patrimoniales), en minúsculas y con mayúscula inicial
// (nombres de personas). Quién lo hizo tiene ahora su propio filtro
// (usuarioId).
export function buildAuditoriaWhere(params: AuditoriaFiltrosParams): Prisma.AuditoriaLogWhereInput {
  const { q, entidad, accion, usuarioId, fechaDesde, fechaHasta } = params;
  const filtros: Prisma.AuditoriaLogWhereInput[] = [];

  const texto = q?.trim();
  if (texto) {
    const capitalizado = texto.toLowerCase().replace(/(^|\s)\p{L}/gu, (letra) => letra.toUpperCase());
    const variantes = [...new Set([texto, texto.toUpperCase(), texto.toLowerCase(), capitalizado])];
    filtros.push({
      OR: [
        { usuario: { nombres: { contains: texto, mode: "insensitive" } } },
        { usuario: { apellidos: { contains: texto, mode: "insensitive" } } },
        ...CLAVES_BUSCABLES.flatMap((clave) =>
          variantes.map((variante) => ({ detalle: { path: [clave], string_contains: variante } }))
        ),
      ],
    });
  }
  if (entidad && entidad !== "all") filtros.push({ entidad });
  if (accion && accion !== "all") filtros.push({ accion: accion as TipoAccionAuditoria });
  if (usuarioId && usuarioId !== "all") filtros.push({ usuarioId });
  if (fechaDesde) filtros.push({ fecha: { gte: new Date(`${fechaDesde}T00:00:00`) } });
  if (fechaHasta) filtros.push({ fecha: { lte: new Date(`${fechaHasta}T23:59:59`) } });

  return filtros.length > 0 ? { AND: filtros } : {};
}
