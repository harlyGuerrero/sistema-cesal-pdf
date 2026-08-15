import { ESTADO_PATRIMONIAL_LABELS, TIPO_MOVIMIENTO_LABELS } from "@/lib/activos/labels";
import { Section } from "./field";

export interface MovimientoRow {
  id: string;
  tipo: string;
  fecha: Date;
  motivo: string | null;
  usuario: { nombre: string } | null;
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

function cambio(label: string, antes: string | null, despues: string | null): string | null {
  if (antes === despues) return null;
  if (antes === null && despues === null) return null;
  return `${label}: ${antes ?? "—"} → ${despues ?? "—"}`;
}

function describirMovimiento(movimiento: MovimientoRow): string[] {
  const lineas = [
    cambio("Responsable", movimiento.responsableAnterior?.nombre ?? null, movimiento.responsableNuevo?.nombre ?? null),
    cambio("Sede", movimiento.sedeAnterior?.name ?? null, movimiento.sedeNueva?.name ?? null),
    cambio(
      "Unidad operativa",
      movimiento.unidadOperativaAnterior?.name ?? null,
      movimiento.unidadOperativaNueva?.name ?? null
    ),
    cambio("Ambiente", movimiento.ambienteAnterior?.name ?? null, movimiento.ambienteNuevo?.name ?? null),
    cambio(
      "Estado",
      movimiento.estadoAnterior ? (ESTADO_PATRIMONIAL_LABELS[movimiento.estadoAnterior] ?? movimiento.estadoAnterior) : null,
      movimiento.estadoNuevo ? (ESTADO_PATRIMONIAL_LABELS[movimiento.estadoNuevo] ?? movimiento.estadoNuevo) : null
    ),
  ].filter((linea): linea is string => linea !== null);

  return lineas;
}

// Fase 9 de Activos: historial inmutable, ordenado del más reciente al más
// antiguo. Cada fila deriva su propia descripción a partir de los snapshots
// antes/después que ya trae el Movimiento — no depende de texto libre.
export function HistorialSection({ movimientos }: { movimientos: MovimientoRow[] }) {
  if (movimientos.length === 0) {
    return (
      <Section title="Historial de movimientos">
        <p className="col-span-2 text-sm text-muted-foreground">Sin movimientos registrados todavía.</p>
      </Section>
    );
  }

  return (
    <section className="space-y-2 break-inside-avoid">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Historial de movimientos
      </h2>
      <ol className="space-y-3 border-l pl-4">
        {movimientos.map((movimiento) => {
          const detalle = describirMovimiento(movimiento);
          return (
            <li key={movimiento.id}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium">
                  {TIPO_MOVIMIENTO_LABELS[movimiento.tipo] ?? movimiento.tipo}
                </span>
                <span className="text-xs text-muted-foreground">
                  {movimiento.fecha.toLocaleString("es-PE")}
                  {movimiento.usuario && ` · ${movimiento.usuario.nombre}`}
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
            </li>
          );
        })}
      </ol>
    </section>
  );
}
