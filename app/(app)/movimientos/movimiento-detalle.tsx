import { MapPinIcon, MoveRightIcon } from "lucide-react";
import { ESTADO_PATRIMONIAL_LABELS } from "@/lib/activos/labels";
import { cambiosDeMovimiento, tonoTransicionEstado, type MovimientoDetalleRow } from "@/lib/activos/movimientos";

// Fase 15: reemplaza la línea de texto plano "Campo: antes → después · ..."
// por tarjetas De/A y un chip de color para el cambio de estado — mismo
// dato (cambiosDeMovimiento), presentación más legible en la tabla de
// /movimientos. La ficha imprimible (ficha/historial-section.tsx) sigue
// usando describirMovimiento en texto plano a propósito: ese documento se
// imprime, no vale la pena colorear algo que puede salir en blanco y negro.
export function MovimientoDetalleCell({
  movimiento,
}: {
  movimiento: MovimientoDetalleRow & { motivo: string | null };
}) {
  const cambios = cambiosDeMovimiento(movimiento);
  const sinCambios =
    !cambios.responsable &&
    !cambios.sede &&
    !cambios.unidadOperativa &&
    !cambios.ambiente &&
    !cambios.estado &&
    !movimiento.motivo;

  if (sinCambios) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className="min-w-64 space-y-1.5 py-1">
      {cambios.responsable && (
        <ChangeRow
          beforeLabel="Responsable anterior"
          beforeValue={cambios.responsable.antes}
          afterLabel="Nuevo responsable"
          afterValue={cambios.responsable.despues}
        />
      )}
      {cambios.sede && (
        <ChangeRow
          beforeLabel="Sede anterior"
          beforeValue={cambios.sede.antes}
          afterLabel="Nueva sede"
          afterValue={cambios.sede.despues}
          icon={MapPinIcon}
        />
      )}
      {!cambios.sede && cambios.unidadOperativa && (
        <ChangeRow
          beforeLabel="Unidad anterior"
          beforeValue={cambios.unidadOperativa.antes}
          afterLabel="Nueva unidad"
          afterValue={cambios.unidadOperativa.despues}
          icon={MapPinIcon}
        />
      )}
      {!cambios.sede && !cambios.unidadOperativa && cambios.ambiente && (
        <ChangeRow
          beforeLabel="Ambiente anterior"
          beforeValue={cambios.ambiente.antes}
          afterLabel="Nuevo ambiente"
          afterValue={cambios.ambiente.despues}
          icon={MapPinIcon}
        />
      )}
      {cambios.estado && <EstadoChip antes={cambios.estado.antes} despues={cambios.estado.despues} />}
      {movimiento.motivo && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Motivo:</span> {movimiento.motivo}
        </p>
      )}
    </div>
  );
}

function ChangeRow({
  beforeLabel,
  beforeValue,
  afterLabel,
  afterValue,
  icon: Icon,
}: {
  beforeLabel: string;
  beforeValue: string | null;
  afterLabel: string;
  afterValue: string | null;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <ChangeCard label={beforeLabel} value={beforeValue} icon={Icon} />
      <MoveRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <ChangeCard label={afterLabel} value={afterValue} icon={Icon} />
    </div>
  );
}

function ChangeCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-md border bg-muted/30 px-2 py-1">
      <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
        {Icon && <Icon className="size-2.5 shrink-0" />}
        {label}
      </p>
      <p className="truncate text-xs font-medium">{value ?? "—"}</p>
    </div>
  );
}

function EstadoChip({ antes, despues }: { antes: string | null; despues: string | null }) {
  const tono = tonoTransicionEstado(antes, despues);
  const color = `var(--color-${tono})`;
  const label = (estado: string | null) => (estado ? (ESTADO_PATRIMONIAL_LABELS[estado] ?? estado) : "—");

  return (
    <div
      className="w-fit rounded-md px-2 py-1 text-xs font-medium"
      style={{ backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`, color }}
    >
      Estado: {label(antes)} → {label(despues)}
    </div>
  );
}
