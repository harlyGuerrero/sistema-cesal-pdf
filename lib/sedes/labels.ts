import { MountainIcon, TreePineIcon, WavesIcon, type LucideIcon } from "lucide-react";

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

// Fase 31: ícono + color fijo por región — mismo criterio estructural que
// TIPO_ACTIVO_META/ROL_USUARIO_META (las 3 regiones son un enum cerrado, ver
// schema.prisma). Reusado por la vista por zonas y la vista de lista de
// /sedes para que el color de una región sea siempre el mismo en cualquier
// lugar donde aparezca.
export const REGION_META: Record<string, { icon: LucideIcon; color: string }> = {
  COSTA: { icon: WavesIcon, color: "var(--primary)" },
  SIERRA: { icon: MountainIcon, color: "var(--color-good)" },
  SELVA: { icon: TreePineIcon, color: "var(--color-chart-5)" },
};
