import Link from "next/link";
import { describirMovimiento, type MovimientoDetalleRow } from "@/lib/activos/movimientos";
import { TIPO_MOVIMIENTO_LABELS } from "@/lib/activos/labels";
import { MOVIMIENTO_META } from "@/lib/activos/movimiento-meta";
import type { TipoMovimiento } from "@/lib/generated/prisma/client";

export interface MovimientoFeedRow extends MovimientoDetalleRow {
  id: string;
  tipo: TipoMovimiento;
  fecha: Date;
  motivo: string | null;
  activo: { id: string; nombreActivo: string };
}

export function MovimientosFeed({ movimientos }: { movimientos: MovimientoFeedRow[] }) {
  return (
    <ul className="space-y-4">
      {movimientos.map((movimiento) => {
        const { icon: Icon, color } = MOVIMIENTO_META[movimiento.tipo];
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
