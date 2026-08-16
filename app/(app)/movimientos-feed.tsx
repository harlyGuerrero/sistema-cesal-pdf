import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { describirMovimiento } from "@/lib/activos/movimientos";
import { TIPO_MOVIMIENTO_LABELS } from "@/lib/activos/labels";
import type { TipoMovimiento } from "@/lib/generated/prisma/client";

export interface MovimientoFeedRow {
  id: string;
  tipo: TipoMovimiento;
  fecha: Date;
  motivo: string | null;
  activo: { id: string; nombreActivo: string };
  responsableAnterior: { nombre: string } | null;
  responsableNuevo: { nombre: string } | null;
  sedeAnterior: { name: string } | null;
  sedeNueva: { name: string } | null;
  unidadOperativaAnterior: { name: string } | null;
  unidadOperativaNueva: { name: string } | null;
  ambienteAnterior: { name: string } | null;
  ambienteNuevo: { name: string } | null;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
}

// Sentido de cada TipoMovimiento para el ícono/color del feed — mismo
// criterio de "bueno/neutral/atención/crítico" que el resto del sistema
// (skill dataviz: colores de estado fijos, nunca por serie).
const MOVIMIENTO_ICON_META: Record<TipoMovimiento, { icon: LucideIcon; color: string }> = {
  ALTA: { icon: ArrowUpIcon, color: "var(--color-good)" },
  ASIGNACION: { icon: ArrowUpIcon, color: "var(--color-good)" },
  REASIGNACION: { icon: ArrowRightIcon, color: "var(--color-chart-1)" },
  CAMBIO_RESPONSABLE: { icon: ArrowRightIcon, color: "var(--color-chart-1)" },
  TRANSFERENCIA: { icon: ArrowRightIcon, color: "var(--color-chart-1)" },
  CAMBIO_UBICACION: { icon: ArrowRightIcon, color: "var(--color-chart-1)" },
  MANTENIMIENTO: { icon: WrenchIcon, color: "var(--color-warning)" },
  RETORNO_MANTENIMIENTO: { icon: ArrowUpIcon, color: "var(--color-good)" },
  BAJA: { icon: ArrowDownIcon, color: "var(--color-critical)" },
  REACTIVACION: { icon: ArrowUpIcon, color: "var(--color-good)" },
};

export function MovimientosFeed({ movimientos }: { movimientos: MovimientoFeedRow[] }) {
  return (
    <ul className="space-y-4">
      {movimientos.map((movimiento) => {
        const { icon: Icon, color } = MOVIMIENTO_ICON_META[movimiento.tipo];
        const detalle = movimiento.motivo ?? describirMovimiento(movimiento)[0] ?? null;
        return (
          <li key={movimiento.id} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{TIPO_MOVIMIENTO_LABELS[movimiento.tipo]}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {movimiento.fecha.toLocaleDateString("es-PE")}
                </span>
              </div>
              <Link href={`/activos/${movimiento.activo.id}`} className="block truncate text-sm hover:underline">
                {movimiento.activo.nombreActivo}
              </Link>
              {detalle && <p className="truncate text-xs text-muted-foreground">{detalle}</p>}
            </div>
          </li>
        );
      })}
      {movimientos.length === 0 && <li className="text-sm text-muted-foreground">Sin movimientos todavía.</li>}
    </ul>
  );
}
