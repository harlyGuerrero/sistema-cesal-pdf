import { TIPO_MOVIMIENTO_LABELS, TIPO_MOVIMIENTO_TAG_LABELS } from "@/lib/activos/labels";
import { MOVIMIENTO_META } from "@/lib/activos/movimiento-meta";
import type { TipoMovimiento } from "@/lib/generated/prisma/client";

// Fase 15: ícono + etiqueta + chip de color — la unidad visual de "qué tipo
// de movimiento fue esto", reusada en la tabla de /movimientos y en el feed
// de últimos movimientos del Dashboard.
export function MovimientoBadge({ tipo }: { tipo: TipoMovimiento }) {
  const { icon: Icon, color } = MOVIMIENTO_META[tipo];
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
      >
        <Icon className="size-4" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{TIPO_MOVIMIENTO_LABELS[tipo]}</p>
        <span
          className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
          style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
        >
          {TIPO_MOVIMIENTO_TAG_LABELS[tipo]}
        </span>
      </div>
    </div>
  );
}
