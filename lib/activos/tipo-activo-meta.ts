import {
  ArmchairIcon,
  Building2Icon,
  CarIcon,
  MonitorIcon,
  PrinterIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import type { TipoActivoCode } from "@/lib/generated/prisma/client";

// Fase 19: ícono + color fijo por categoría patrimonial (TipoActivoCode) —
// mismo criterio estructural que ya usa PREFIJO_TIPO_ACTIVO en
// codigo-patrimonial.ts, para la columna "Tipo de activo" de /activos.
// Deliberadamente NO se adivina un ícono a partir del nombre del producto
// (ej. "router" -> ícono de wifi): eso requeriría una lista de palabras
// clave por producto, justo lo que CLAUDE.md prohíbe para la detección
// estructural del sistema (regla 3) — 6 categorías cerradas, 6 íconos fijos.
// Los colores evitan good/warning/critical a propósito: esos ya identifican
// el Estado patrimonial en la misma fila (columna Estado) y reusarlos acá
// mezclaría "qué tipo de bien es" con "en qué estado está".
export const TIPO_ACTIVO_META: Record<TipoActivoCode, { icon: LucideIcon; color: string }> = {
  EQUIPOS_INFORMATICOS: { icon: MonitorIcon, color: "var(--primary)" },
  EQUIPOS_DE_OFICINA: { icon: PrinterIcon, color: "var(--color-chart-2)" },
  MUEBLES_DE_OFICINA: { icon: ArmchairIcon, color: "var(--color-chart-5)" },
  BIENES_VEHICULARES: { icon: CarIcon, color: "var(--color-chart-3)" },
  EQUIPOS_DE_MAQUINARIA: { icon: SettingsIcon, color: "var(--color-neutral)" },
  BIENES_INMUEBLES: { icon: Building2Icon, color: "var(--color-chart-2)" },
};
