import {
  ArrowRightLeftIcon,
  PlusCircleIcon,
  FileXIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  TrendingDownIcon,
  UserPlusIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";

// Fase 11 (+ Fase 13 agrega Usuario, Fase 47 agrega Sede/UnidadOperativa/
// Ambiente): etiquetas de TipoAccionAuditoria y la lista de entidades que hoy
// escriben auditoría (ver registrarAuditoria en actions.ts de Activo,
// Documento, Responsable, Usuario y Sede) — no es un enum en la base
// (entidad es texto libre, referencia lógica), así que esta lista documenta
// lo que el sistema realmente produce, no una posibilidad abierta.

export const TIPO_ACCION_AUDITORIA_LABELS: Record<string, string> = {
  CREAR: "Crear",
  ACTUALIZAR: "Actualizar",
  ELIMINAR: "Eliminar",
  DAR_DE_ALTA: "Dar de alta",
  DAR_DE_BAJA: "Dar de baja",
  ASIGNAR: "Asignar",
  TRANSFERIR: "Transferir",
  ADJUNTAR_DOCUMENTO: "Adjuntar documento",
  ELIMINAR_DOCUMENTO: "Eliminar documento",
  PROCESAR_DEPRECIACION: "Procesar depreciación",
};

export const TIPO_ACCION_AUDITORIA_OPTIONS = Object.entries(TIPO_ACCION_AUDITORIA_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const ENTIDADES_AUDITADAS = [
  "Activo",
  "Documento",
  "Responsable",
  "Usuario",
  "Sede",
  "UnidadOperativa",
  "Ambiente",
  "ProcesamientoDepreciacion",
] as const;

// Fase 32: ícono + color fijo por acción, agrupadas por semántica en vez de
// una tonalidad distinta cada una (mismo criterio que ESTADO_PATRIMONIAL_-
// COLOR_VAR: good para lo que "crea/activa", critical para lo que "borra/da
// de baja") — el ícono sigue distinguiendo cada acción dentro de su grupo.
export const TIPO_ACCION_AUDITORIA_META: Record<string, { icon: LucideIcon; color: string }> = {
  CREAR: { icon: PlusIcon, color: "var(--color-good)" },
  // Fase 59: mismo ícono y color que ALTA / ASIGNACION en Movimientos, para
  // que un mismo hecho se vea igual en las dos pantallas.
  DAR_DE_ALTA: { icon: PlusCircleIcon, color: "var(--color-good)" },
  ACTUALIZAR: { icon: PencilIcon, color: "var(--primary)" },
  ASIGNAR: { icon: UserPlusIcon, color: "var(--primary)" },
  TRANSFERIR: { icon: ArrowRightLeftIcon, color: "var(--color-chart-5)" },
  ADJUNTAR_DOCUMENTO: { icon: PaperclipIcon, color: "var(--color-chart-4)" },
  ELIMINAR: { icon: TrashIcon, color: "var(--color-critical)" },
  DAR_DE_BAJA: { icon: XCircleIcon, color: "var(--color-critical)" },
  ELIMINAR_DOCUMENTO: { icon: FileXIcon, color: "var(--color-critical)" },
  PROCESAR_DEPRECIACION: { icon: TrendingDownIcon, color: "var(--color-chart-3)" },
};
