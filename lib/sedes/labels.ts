// Etiquetas de Region compartidas entre las pantallas de Sedes (Fase B).

export const REGION_LABELS: Record<string, string> = {
  COSTA: "Costa",
  SIERRA: "Sierra",
  SELVA: "Selva",
};

export const REGION_OPTIONS = [
  { value: "COSTA", label: "Costa" },
  { value: "SIERRA", label: "Sierra" },
  { value: "SELVA", label: "Selva" },
] as const;
