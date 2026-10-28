import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilaExpandible } from "@/components/historial/fila-expandible";
import { DatosDetalle, IconoTipo, RejillaCambios } from "@/components/historial/historial-parts";
import { nombreCompleto } from "@/lib/nombre-completo";
import { narrarMovimiento, ubicacionActual, type MovimientoNarrable } from "@/lib/activos/movimiento-narrativa";

export interface MovimientoTablaRow extends MovimientoNarrable {
  id: string;
  fecha: Date;
  usuario: { nombres: string; apellidos: string } | null;
  activo: {
    id: string;
    nombreActivo: string;
    codigoPatrimonial: string;
    sede: { name: string } | null;
    unidadOperativa: { name: string } | null;
    ambiente: { name: string } | null;
  };
}

const ZONA = "America/Lima";
const FECHA = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: ZONA });
const HORA = new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });
const FECHA_EXACTA = new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeStyle: "medium", timeZone: ZONA });

// Fase 59: historial de movimientos como tabla legible — la primera columna
// es la frase de qué pasó (narrarMovimiento, solo con lo que el movimiento
// guardó); quién y cuándo en columnas fijas; el antes/ahora campo por campo
// queda en la fila abierta. La usan /movimientos (con columna Activo) y el
// detalle de un activo (sin ella: ya se sabe de qué activo se trata).
export function MovimientosTabla({
  movimientos,
  mostrarActivo = true,
  encabezadoFecha = "Fecha",
}: {
  movimientos: MovimientoTablaRow[];
  mostrarActivo?: boolean;
  encabezadoFecha?: React.ReactNode;
}) {
  const columnas = mostrarActivo ? 5 : 4;

  return (
    <Table className="table-fixed max-md:block">
      <TableHeader className="max-md:hidden">
        <TableRow className="hover:bg-transparent">
          <TableHead className={mostrarActivo ? "w-[44%] pl-4" : "w-[58%] pl-4"}>Qué pasó</TableHead>
          {mostrarActivo && <TableHead>Activo</TableHead>}
          <TableHead>Registrado por</TableHead>
          <TableHead className="w-32">{encabezadoFecha}</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Detalles</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="max-md:block max-md:divide-y">
        {movimientos.map((movimiento) => {
          const n = narrarMovimiento(movimiento);
          const registradoPor = movimiento.usuario ? nombreCompleto(movimiento.usuario) : "Usuario no registrado";
          const ubicacion = ubicacionActual(movimiento.activo);

          return (
            <FilaExpandible
              key={movimiento.id}
              columnas={columnas}
              etiqueta={n.titulo}
              celdas={
                <>
                  <TableCell className="pl-4 whitespace-normal max-md:col-start-1 max-md:row-start-1 max-md:p-0">
                    <div className="flex gap-3">
                      <IconoTipo icon={n.categoria.icon} color={n.categoria.color} />
                      <div className="min-w-0 space-y-0.5">
                        <p className="leading-snug font-medium text-pretty">{n.titulo}</p>
                        <p className="text-xs text-muted-foreground">{n.categoria.label}</p>
                        {n.resumen.map((linea) => (
                          <p key={linea} className="text-sm text-muted-foreground">
                            {linea}
                          </p>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  {mostrarActivo && (
                    <TableCell className="whitespace-normal max-md:col-span-2 max-md:p-0 max-md:pl-10">
                      <Link
                        href={`/activos/${movimiento.activo.id}`}
                        className="font-medium underline-offset-4 hover:text-primary hover:underline"
                      >
                        {movimiento.activo.nombreActivo}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">{movimiento.activo.codigoPatrimonial}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Hoy en: {ubicacion ?? "sin ubicación registrada"}</p>
                    </TableCell>
                  )}
                  <TableCell className="whitespace-normal max-md:col-span-2 max-md:p-0 max-md:pl-10 max-md:text-xs max-md:text-muted-foreground">
                    <span className="md:hidden">Registrado por </span>
                    {registradoPor}
                  </TableCell>
                  <TableCell className="tabular-nums max-md:col-span-2 max-md:p-0 max-md:pl-10 max-md:text-xs max-md:text-muted-foreground">
                    <time dateTime={movimiento.fecha.toISOString()}>
                      {FECHA.format(movimiento.fecha)}
                      <span className="block text-xs text-muted-foreground max-md:inline max-md:before:content-['_·_']">
                        {HORA.format(movimiento.fecha)}
                      </span>
                    </time>
                  </TableCell>
                </>
              }
              detalle={
                <div className="space-y-4">
                  <RejillaCambios filas={n.detalles} />
                  <DatosDetalle
                    datos={[
                      { label: "Motivo", value: movimiento.motivo ?? <span className="text-muted-foreground">No especificado</span> },
                      {
                        label: "Observaciones",
                        value: movimiento.observaciones ?? <span className="text-muted-foreground">Sin observaciones</span>,
                      },
                      { label: "Fecha exacta", value: <span className="first-letter:uppercase">{FECHA_EXACTA.format(movimiento.fecha)}</span> },
                    ]}
                  />
                  {mostrarActivo && (
                    <Link
                      href={`/movimientos?activoId=${movimiento.activo.id}`}
                      className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Ver todo el historial de este activo
                    </Link>
                  )}
                </div>
              }
            />
          );
        })}
      </TableBody>
    </Table>
  );
}
