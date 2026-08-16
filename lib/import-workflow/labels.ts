import {
  CircleAlertIcon,
  ClipboardListIcon,
  EyeOffIcon,
  Loader2Icon,
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";

// Etiquetas y variantes de Badge compartidas entre las pantallas de
// Importaciones (Fase 9 y Fase 11) — un solo lugar para no duplicarlas.

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const IMPORT_STATUS_LABELS: Record<string, string> = {
  UPLOADED: "Subido",
  PROCESSING: "Procesando",
  READY_FOR_REVIEW: "Listo para revisión",
  COMPLETED: "Completado",
  FAILED: "Falló",
};

export const IMPORT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  UPLOADED: "outline",
  PROCESSING: "secondary",
  READY_FOR_REVIEW: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
};

// Fase 20: ícono + color fijo + subtítulo por Import.status — para el chip
// de estado de /importaciones (mismo criterio visual que MovimientoBadge /
// TIPO_ACTIVO_META: color estructural por estado, nunca por contenido del
// PDF). El subtítulo describe la etapa del flujo documentado en la skill
// import-workflow (UPLOADED → PROCESSING → READY_FOR_REVIEW → COMPLETED,
// o → FAILED).
export const IMPORT_STATUS_META: Record<
  string,
  { icon: LucideIcon; color: string; hint: string }
> = {
  UPLOADED: { icon: ClockIcon, color: "var(--color-neutral)", hint: "En cola" },
  PROCESSING: { icon: Loader2Icon, color: "var(--primary)", hint: "Procesando…" },
  READY_FOR_REVIEW: {
    icon: ClipboardListIcon,
    color: "var(--color-warning)",
    hint: "Pendiente de revisión",
  },
  COMPLETED: { icon: CheckCircle2Icon, color: "var(--color-good)", hint: "Importación exitosa" },
  FAILED: { icon: CircleAlertIcon, color: "var(--color-critical)", hint: "El procesamiento falló" },
};

export const IMPORT_ITEM_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  REJECTED: "Rechazado",
  REVIEW_REQUIRED: "Pendiente",
  IGNORED: "Ignorado",
};

export const IMPORT_ITEM_STATUS_VARIANT: Record<string, BadgeVariant> = {
  CONFIRMED: "default",
  REJECTED: "destructive",
  REVIEW_REQUIRED: "secondary",
  IGNORED: "outline",
};

// Fase 21: ícono + color fijo por ImportItem.status — mismo criterio que
// IMPORT_STATUS_META, para el chip de estado de la tabla de revisión
// (/importaciones/[id]).
export const IMPORT_ITEM_STATUS_META: Record<string, { icon: LucideIcon; color: string }> = {
  CONFIRMED: { icon: CheckCircle2Icon, color: "var(--color-good)" },
  REJECTED: { icon: XCircleIcon, color: "var(--color-critical)" },
  REVIEW_REQUIRED: { icon: ClockIcon, color: "var(--color-warning)" },
  IGNORED: { icon: EyeOffIcon, color: "var(--color-neutral)" },
};
