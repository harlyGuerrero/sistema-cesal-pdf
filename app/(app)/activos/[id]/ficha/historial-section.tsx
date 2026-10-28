import { HistoryIcon } from "lucide-react";
import type { TipoMovimiento } from "@/lib/generated/prisma/client";
import type { MovimientoDetalleRow } from "@/lib/activos/movimientos";
import { narrarMovimiento } from "@/lib/activos/movimiento-narrativa";
import { nombreCompleto } from "@/lib/nombre-completo";
import { Section } from "./field";

export interface MovimientoRow extends MovimientoDetalleRow {
  id: string;
  tipo: TipoMovimiento;
  fecha: Date;
  motivo: string | null;
  observaciones: string | null;
  usuario: { nombres: string; apellidos: string } | null;
}

const FECHA = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

// Fase 9 de Activos, restilizada en Fase 26 y en Fase 59: historial de la
// ficha imprimible. Misma frase que /movimientos y el detalle del activo
// (narrarMovimiento), pero sin nada que abrir: en papel todo va a la vista,
// así que lo que cambió se lista bajo la frase y el motivo va al lado.
export function HistorialSection({ movimientos }: { movimientos: MovimientoRow[] }) {
  if (movimientos.length === 0) {
    return (
      <Section title="Historial de movimientos" icon={HistoryIcon} color="var(--color-chart-5)">
        <p className="col-span-2 text-sm text-muted-foreground">Sin movimientos registrados todavía.</p>
      </Section>
    );
  }

  return (
    <Section title="Historial de movimientos" icon={HistoryIcon} color="var(--color-chart-5)" bodyClassName="p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="w-[55%] px-4 py-2 font-medium">Qué pasó</th>
            <th className="px-2 py-2 font-medium">Registrado por</th>
            <th className="px-4 py-2 font-medium whitespace-nowrap">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((movimiento) => {
            const n = narrarMovimiento(movimiento);
            return (
              <tr key={movimiento.id} className="break-inside-avoid border-b align-top last:border-b-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{n.titulo}</p>
                  {n.resumen.map((linea) => (
                    <p key={linea} className="text-muted-foreground">
                      {linea}
                    </p>
                  ))}
                  {movimiento.motivo && movimiento.tipo !== "BAJA" && (
                    <p className="text-muted-foreground">Motivo: {movimiento.motivo}</p>
                  )}
                  {movimiento.observaciones && (
                    <p className="text-muted-foreground">Observaciones: {movimiento.observaciones}</p>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  {movimiento.usuario ? nombreCompleto(movimiento.usuario) : "Usuario no registrado"}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{FECHA.format(movimiento.fecha)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}
