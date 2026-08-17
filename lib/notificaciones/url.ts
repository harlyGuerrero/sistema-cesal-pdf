// Fase 49: mapea entidad/entidadId (misma convención que AuditoriaLog, ver
// schema.prisma) al detalle correspondiente — /activos/[id] resuelve por el
// id cuid de Activo, no por codigoPatrimonial (ver app/(app)/activos/[id]/page.tsx).
// No hay ruta de detalle para Documento ni Movimiento (ambos viven dentro de
// la ficha de su Activo) — sus notificaciones usan entidad: "Activo" directo.
export function resolverUrlNotificacion(entidad: string | null, entidadId: string | null): string | null {
  if (!entidad || !entidadId) return null;

  switch (entidad) {
    case "Activo":
      return `/activos/${entidadId}`;
    case "Import":
      return `/importaciones/${entidadId}`;
    default:
      return null;
  }
}
