import Link from "next/link";
import { InfoIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatFecha, formatPeriodo, formatPorcentaje, formatSoles } from "@/lib/depreciacion/calculo";
import type { DepreciacionActivo } from "@/lib/depreciacion/detalle";
import { formatTasa } from "@/lib/depreciacion/tasas";
import { EstadoDepreciacionBadge } from "../../depreciacion/estado-depreciacion-badge";

// Fase 58: contenido de la sección "Depreciación" de un activo — resumen,
// barra de avance e historial por trimestre. Solo presentación: los datos
// llegan ya calculados por cargarDepreciacionActivo (servidor). Se usa en el
// detalle (/activos/[id]) y en la ficha técnica imprimible.
export function DepreciacionActivoContent({ data }: { data: DepreciacionActivo }) {
  const { resumen, historial } = data;
  const porcentaje = Math.min(100, Math.max(0, resumen.porcentajeDepreciado));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <EstadoDepreciacionBadge estado={resumen.estado} />
        {resumen.ultimoPeriodo && (
          <span className="text-xs text-muted-foreground">
            Último periodo: {formatPeriodo(resumen.ultimoPeriodo)} · {resumen.cantidadPeriodos}{" "}
            {resumen.cantidadPeriodos === 1 ? "trimestre depreciado" : "trimestres depreciados"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:grid-cols-3">
        <Monto label="Costo original" value={formatSoles(resumen.costoCentavos)} color="var(--color-chart-2)" />
        <Monto label="Depreciación acumulada" value={formatSoles(resumen.acumuladoCentavos)} color="var(--color-chart-3)" />
        <Monto label="Valor neto contable" value={formatSoles(resumen.valorNetoCentavos)} color="var(--color-chart-4)" destacado />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Depreciado</span>
          <span className="font-medium tabular-nums">{formatPorcentaje(porcentaje)}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Porcentaje del costo ya depreciado"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcentaje}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full" style={{ width: `${porcentaje}%`, backgroundColor: "var(--color-chart-3)" }} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 print:grid-cols-3">
        <Dato label="Fecha de adquisición" value={formatFecha(data.fechaAdquisicion)} />
        <Dato label="Tipo de activo" value={data.tipoActivo} />
        <Dato label="Tasa anual / trimestral" value={`${formatTasa(resumen.tasaAnual)} / ${formatTasa(resumen.tasaTrimestral)}`} />
        <Dato
          label="Último registro"
          value={data.ultimoRegistroEn ? data.ultimoRegistroEn.toLocaleDateString("es-PE", { timeZone: "America/Lima" }) : "—"}
        />
      </dl>

      {resumen.problemas.length > 0 && (
        <div
          className="flex gap-2 rounded-lg border px-3 py-2.5 text-sm"
          style={{ borderColor: "color-mix(in oklch, var(--color-warning) 40%, var(--border))" }}
        >
          <InfoIcon className="mt-0.5 size-4 shrink-0" style={{ color: "var(--color-warning)" }} />
          <div className="space-y-0.5">
            <p className="font-medium">No se puede depreciar hasta corregir:</p>
            <ul className="list-disc pl-4 text-muted-foreground">
              {resumen.problemas.map((problema) => (
                <li key={problema.codigo}>{problema.mensaje}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {historial.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {resumen.problemas.length > 0
            ? "Sin periodos registrados: primero hay que completar los datos indicados arriba."
            : (
              <>
                Sin periodos registrados todavía. Se registrarán al procesar el trimestre desde el módulo{" "}
                <Link href="/depreciacion" className="font-medium text-primary underline-offset-4 hover:underline print:no-underline">
                  Depreciación
                </Link>
                .
              </>
            )}
        </p>
      ) : (
        // Sin columna "Costo base" (siempre es el costo original de arriba:
        // verificarHistorial lo exige) y con quién procesó bajo la fecha, para
        // que la tabla entre en la tarjeta del detalle sin barra horizontal. En
        // celular quedan periodo, depreciación y valor neto (la tasa está arriba
        // y el acumulado es costo − valor neto).
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-3">Periodo</TableHead>
                <TableHead className="text-right max-sm:hidden print:table-cell">Tasa</TableHead>
                <TableHead className="text-right">Depreciación</TableHead>
                <TableHead className="text-right max-sm:hidden print:table-cell">Acumulada</TableHead>
                <TableHead className="text-right">Valor neto</TableHead>
                <TableHead className="pr-3 max-sm:hidden print:table-cell">Registrado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.map((periodo) => {
                const llegoACero = periodo.valorNetoCentavos === 0;
                return (
                  <TableRow
                    key={periodo.id}
                    className={cn(llegoACero && "font-medium")}
                    style={llegoACero ? { backgroundColor: "color-mix(in oklch, var(--color-good) 8%, transparent)" } : undefined}
                  >
                    <TableCell className="pl-3 whitespace-nowrap">
                      {formatPeriodo(periodo)}
                      {llegoACero && (
                        <span className="ml-1.5 text-xs" style={{ color: "var(--color-good)" }}>
                          · llegó a S/ 0,00
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums max-sm:hidden print:table-cell">{formatTasa(periodo.tasaTrimestral)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSoles(periodo.importeCentavos)}</TableCell>
                    <TableCell className="text-right tabular-nums max-sm:hidden print:table-cell">{formatSoles(periodo.acumuladoCentavos)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSoles(periodo.valorNetoCentavos)}</TableCell>
                    <TableCell className="pr-3 text-xs text-muted-foreground max-sm:hidden print:table-cell">
                      <p className="whitespace-nowrap">
                        {periodo.registradoEn.toLocaleDateString("es-PE", { timeZone: "America/Lima" })}
                      </p>
                      {periodo.usuario && <p className="max-w-32 truncate">{periodo.usuario}</p>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Monto({ label, value, color, destacado = false }: { label: string; value: string; color: string; destacado?: boolean }) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        {label}
      </p>
      <p className={cn("tabular-nums", destacado ? "text-lg font-semibold" : "text-base font-medium")}>{value}</p>
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
