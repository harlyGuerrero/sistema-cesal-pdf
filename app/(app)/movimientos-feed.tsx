import Link from "next/link";
import { HistoryIcon } from "lucide-react";
import { IconoTipo } from "@/components/historial/historial-parts";
import { narrarMovimiento, type MovimientoNarrable } from "@/lib/activos/movimiento-narrativa";
import { nombreCompleto } from "@/lib/nombre-completo";
import { formatearTiempoRelativo } from "@/lib/notificaciones/tiempo-relativo";

export interface MovimientoFeedRow extends MovimientoNarrable {
  id: string;
  fecha: Date;
  usuario: { nombres: string; apellidos: string } | null;
  activo: { id: string; nombreActivo: string; codigoPatrimonial: string };
}

const FECHA_EXACTA = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" });

// Fase 15, rediseñada en Fase 59: "Últimos movimientos" del Dashboard, con
// la misma frase que /movimientos (narrarMovimiento) en vez del nombre del
// tipo más un detalle técnico. Cada entrada responde qué pasó, a qué activo,
// quién lo registró y hace cuánto; el detalle completo está en /movimientos.
export function MovimientosFeed({ movimientos }: { movimientos: MovimientoFeedRow[] }) {
  if (movimientos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HistoryIcon className="size-4" />
        </span>
        <p className="text-sm font-medium">Todavía no hay movimientos</p>
        <p className="max-w-56 text-sm text-muted-foreground">
          Cada alta, asignación o cambio de ubicación de un activo aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <ol className="divide-y">
      {movimientos.map((movimiento) => {
        const n = narrarMovimiento(movimiento);
        return (
          <li key={movimiento.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <IconoTipo icon={n.categoria.icon} color={n.categoria.color} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="line-clamp-2 text-sm leading-snug font-medium text-pretty">{n.titulo}</p>
              <p className="truncate text-sm">
                <Link
                  href={`/activos/${movimiento.activo.id}`}
                  className="underline-offset-4 hover:text-primary hover:underline"
                >
                  {movimiento.activo.nombreActivo}
                </Link>{" "}
                <span className="font-mono text-xs text-muted-foreground">{movimiento.activo.codigoPatrimonial}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {movimiento.usuario ? nombreCompleto(movimiento.usuario) : "Usuario no registrado"} ·{" "}
                <time dateTime={movimiento.fecha.toISOString()} title={FECHA_EXACTA.format(movimiento.fecha)}>
                  {formatearTiempoRelativo(movimiento.fecha)}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
