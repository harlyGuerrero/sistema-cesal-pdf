import { HistoryIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIPO_MOVIMIENTO_LABELS } from "@/lib/activos/labels";
import { describirMovimiento, type MovimientoDetalleRow } from "@/lib/activos/movimientos";
import { nombreCompleto } from "@/lib/nombre-completo";
import { Section } from "./field";

export interface MovimientoRow extends MovimientoDetalleRow {
  id: string;
  tipo: string;
  fecha: Date;
  motivo: string | null;
  usuario: { nombres: string; apellidos: string } | null;
}

// Fase 9 de Activos, restilizada en Fase 26: historial inmutable, ordenado
// del más reciente al más antiguo. Cada fila deriva su propia descripción a
// partir de los snapshots antes/después que ya trae el Movimiento — no
// depende de texto libre.
export function HistorialSection({ movimientos }: { movimientos: MovimientoRow[] }) {
  if (movimientos.length === 0) {
    return (
      <Section title="Historial de movimientos" icon={HistoryIcon} color="var(--color-chart-5)">
        <p className="col-span-2 text-sm text-muted-foreground">Sin movimientos registrados todavía.</p>
      </Section>
    );
  }

  return (
    <Section
      title="Historial de movimientos"
      icon={HistoryIcon}
      color="var(--color-chart-5)"
      bodyClassName="space-y-3"
    >
      {movimientos.map((movimiento, index) => {
        const detalle = describirMovimiento(movimiento);
        const isLast = index === movimientos.length - 1;
        return (
          <div key={movimiento.id} className={cn(!isLast && "border-b border-dashed pb-3")}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium">
                {TIPO_MOVIMIENTO_LABELS[movimiento.tipo] ?? movimiento.tipo}
              </span>
              <span className="text-xs text-muted-foreground">
                {movimiento.fecha.toLocaleString("es-PE")}
                {movimiento.usuario && ` · ${nombreCompleto(movimiento.usuario)}`}
              </span>
            </div>
            {detalle.length > 0 && (
              <ul className="mt-0.5 text-sm text-muted-foreground">
                {detalle.map((linea) => (
                  <li key={linea}>{linea}</li>
                ))}
              </ul>
            )}
            {movimiento.motivo && (
              <p className="mt-0.5 text-sm text-muted-foreground italic">{movimiento.motivo}</p>
            )}
          </div>
        );
      })}
    </Section>
  );
}
