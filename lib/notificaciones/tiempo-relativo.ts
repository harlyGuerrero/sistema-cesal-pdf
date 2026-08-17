// Fase 49: "Hace 5 min" / "Hace 1 h" / "Ayer" / fecha completa — buckets
// pedidos por el spec del panel de notificaciones, no una librería de i18n
// genérica (no hay otro caso de tiempo relativo en el sistema todavía).
export function formatearTiempoRelativo(fecha: Date, ahora: Date = new Date()): string {
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Ahora mismo";
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `Hace ${diffHoras} h`;

  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const diffDias = Math.round((inicioHoy.getTime() - inicioFecha.getTime()) / 86_400_000);

  if (diffDias === 1) return "Ayer";
  if (diffDias < 7) return `Hace ${diffDias} días`;

  return fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
