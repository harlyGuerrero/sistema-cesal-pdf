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
