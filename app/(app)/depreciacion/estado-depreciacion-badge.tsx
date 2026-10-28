import type { EstadoDepreciacion } from "@/lib/depreciacion/calculo";
import { ESTADO_DEPRECIACION_META } from "@/lib/depreciacion/labels";

// Fase 58: chip de estado de depreciación, mismo lenguaje que el chip de
// estado patrimonial de ActivosTable. Compartido por /depreciacion y la
// sección "Depreciación" del detalle del activo.
export function EstadoDepreciacionBadge({ estado }: { estado: EstadoDepreciacion }) {
  const { label, color, descripcion } = ESTADO_DEPRECIACION_META[estado];
  return (
    <span
      title={descripcion}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
