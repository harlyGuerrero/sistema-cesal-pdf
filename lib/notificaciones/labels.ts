import {
  UserPlusIcon,
  UsersIcon,
  UserRoundCogIcon,
  MapPinIcon,
  WrenchIcon,
  ArchiveXIcon,
  FileCheckIcon,
  FileWarningIcon,
  FileTextIcon,
  InfoIcon,
  type LucideIcon,
} from "lucide-react";

// Fase 49: mismo criterio que TIPO_ACCION_AUDITORIA_META/ROL_USUARIO_META —
// ícono + color fijo por valor cerrado del enum, nunca por datos del propio
// registro. "El rojo solo para lo realmente crítico" (a pedido explícito):
// BAJA es el único tipo con --color-critical, el resto usa primary/warning/
// good/neutral según su prioridad natural, no un rojo genérico de alerta.
export const TIPO_NOTIFICACION_LABELS: Record<string, string> = {
  ASIGNACION: "Asignación",
  REASIGNACION: "Reasignación",
  CAMBIO_RESPONSABLE: "Cambio de responsable",
  CAMBIO_UBICACION: "Cambio de ubicación",
  MANTENIMIENTO: "Mantenimiento",
  BAJA: "Baja",
  IMPORTACION_COMPLETADA: "Importación completada",
  IMPORTACION_CON_ERRORES: "Importación con pendientes",
  DOCUMENTO_AGREGADO: "Documento agregado",
  SISTEMA: "Sistema",
};

export const TIPO_NOTIFICACION_META: Record<string, { icon: LucideIcon; color: string }> = {
  ASIGNACION: { icon: UserPlusIcon, color: "var(--primary)" },
  REASIGNACION: { icon: UsersIcon, color: "var(--primary)" },
  CAMBIO_RESPONSABLE: { icon: UserRoundCogIcon, color: "var(--primary)" },
  CAMBIO_UBICACION: { icon: MapPinIcon, color: "var(--primary)" },
  MANTENIMIENTO: { icon: WrenchIcon, color: "var(--color-warning)" },
  BAJA: { icon: ArchiveXIcon, color: "var(--color-critical)" },
  IMPORTACION_COMPLETADA: { icon: FileCheckIcon, color: "var(--color-good)" },
  IMPORTACION_CON_ERRORES: { icon: FileWarningIcon, color: "var(--color-warning)" },
  DOCUMENTO_AGREGADO: { icon: FileTextIcon, color: "var(--color-chart-4)" },
  SISTEMA: { icon: InfoIcon, color: "var(--color-neutral)" },
};

// Prioridad visual, independiente del tipo (ver punto 14 del spec: NORMAL
// azul suave, INFORMATIVA gris/azul neutro, ALTA ámbar — nunca rojo).
export const PRIORIDAD_NOTIFICACION_META: Record<string, { label: string; color: string }> = {
  NORMAL: { label: "Normal", color: "var(--primary)" },
  ALTA: { label: "Alta", color: "var(--color-warning)" },
  INFORMATIVA: { label: "Informativa", color: "var(--color-neutral)" },
};

// Fase 49: agrupación de TipoNotificacion en las 5 categorías de filtro que
// pide la pantalla /notificaciones (punto 11) — no es un campo nuevo en el
// modelo, solo una vista de los 10 tipos ya cerrados.
export const CATEGORIA_NOTIFICACION_OPTIONS = [
  { value: "all", label: "Todas" },
  {
    value: "activos",
    label: "Activos",
    tipos: ["ASIGNACION", "REASIGNACION", "CAMBIO_RESPONSABLE", "CAMBIO_UBICACION", "BAJA"],
  },
  { value: "mantenimiento", label: "Mantenimiento", tipos: ["MANTENIMIENTO"] },
  {
    value: "importaciones",
    label: "Importaciones",
    tipos: ["IMPORTACION_COMPLETADA", "IMPORTACION_CON_ERRORES"],
  },
  { value: "documentos", label: "Documentos", tipos: ["DOCUMENTO_AGREGADO"] },
  { value: "sistema", label: "Sistema", tipos: ["SISTEMA"] },
] as const;

export function tiposPorCategoria(categoria: string): string[] | null {
  const grupo = CATEGORIA_NOTIFICACION_OPTIONS.find((c) => c.value === categoria);
  return grupo && "tipos" in grupo ? [...grupo.tipos] : null;
}
