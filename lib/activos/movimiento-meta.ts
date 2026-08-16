import {
  ArrowLeftRightIcon,
  Building2Icon,
  MapPinIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  RotateCwIcon,
  Trash2Icon,
  UserCogIcon,
  UserPlusIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { TipoMovimiento } from "@/lib/generated/prisma/client";

// Fase 15: color + ícono fijos por TipoMovimiento, reusados por la vista
// global (/movimientos) y el feed del Dashboard para que un mismo tipo se
// lea igual en todo el sistema (dirección de diseño aprobada por el usuario
// sobre una referencia con badges/íconos por tipo de movimiento). Reusa los
// hues ya validados por la skill dataviz (chart-1..6 + good/warning/critical)
// en vez de inventar colores nuevos — con 10 tipos y 8 hues disponibles, dos
// pares comparten hue y se distinguen por ícono + etiqueta, igual que hace
// la referencia misma (ej. Reasignación/Transferencia comparten azul).
export const MOVIMIENTO_META: Record<TipoMovimiento, { icon: LucideIcon; color: string }> = {
  ALTA: { icon: PlusCircleIcon, color: "var(--color-good)" },
  ASIGNACION: { icon: UserPlusIcon, color: "var(--color-good)" },
  REASIGNACION: { icon: ArrowLeftRightIcon, color: "var(--color-chart-1)" },
  CAMBIO_RESPONSABLE: { icon: UserCogIcon, color: "var(--color-chart-2)" },
  TRANSFERENCIA: { icon: Building2Icon, color: "var(--color-chart-1)" },
  CAMBIO_UBICACION: { icon: MapPinIcon, color: "var(--color-chart-5)" },
  MANTENIMIENTO: { icon: WrenchIcon, color: "var(--color-warning)" },
  RETORNO_MANTENIMIENTO: { icon: RotateCcwIcon, color: "var(--color-chart-3)" },
  BAJA: { icon: Trash2Icon, color: "var(--color-critical)" },
  REACTIVACION: { icon: RotateCwIcon, color: "var(--color-chart-6)" },
};
