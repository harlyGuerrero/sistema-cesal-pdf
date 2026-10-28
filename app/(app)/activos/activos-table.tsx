import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ESTADO_PATRIMONIAL_COLOR_VAR, ESTADO_PATRIMONIAL_LABELS } from "@/lib/activos/labels";
import { TIPO_ACTIVO_META } from "@/lib/activos/tipo-activo-meta";
import { nombreCompleto } from "@/lib/nombre-completo";
import type { EstadoPatrimonial, TipoActivoCode } from "@/lib/generated/prisma/client";
import { ActivoRowActions } from "./activo-row-actions";

export interface ActivoTableRow {
  id: string;
  nombreActivo: string;
  codigoPatrimonial: string;
  numeroFactura: string | null;
  numeroFC: string | null;
  estadoPatrimonial: EstadoPatrimonial;
  tipoActivo: { code: TipoActivoCode; name: string };
  sede: { name: string } | null;
  unidadOperativa: { name: string } | null;
  subcategoria: { nombre: string } | null;
  responsableActual: { nombres: string; apellidos: string; email: string } | null;
}

const COLUMN_COUNT = 7;

// Fase 25: tabla de Activos extraída de /activos (Fase 19) para reusarla tal
// cual en el Dashboard ("Activos recientes") — mismo ícono por categoría
// patrimonial, mismo chip de color por estado, mismas acciones por fila. Un
// único lugar para no divergir visualmente entre ambas pantallas.
//
// Responsive: el tipo va bajo el código y el N° FC bajo la factura para que
// la tabla entre sin barra horizontal en escritorio; por debajo de xl se
// oculta Factura / FC (sigue en el detalle y en el buscador) y en celular
// (< md) cada activo es una tarjeta en lugar de una fila.
export function ActivosTable({
  activos,
  emptyMessage = "No hay activos que coincidan con el filtro.",
  puedeEliminar = false,
}: {
  activos: ActivoTableRow[];
  emptyMessage?: string;
  // Fase 66: solo SUPER_ADMIN ve "Eliminar" en el menú de cada fila.
  puedeEliminar?: boolean;
}) {
  return (
    <>
      <ul className="divide-y border-t md:hidden">
        {activos.map((activo) => (
          <li key={activo.id} className="space-y-2 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <TipoIcono code={activo.tipoActivo.code} />
              <div className="min-w-0 flex-1">
                <NombreActivo activo={activo} />
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  <span className="tabular-nums">{activo.codigoPatrimonial}</span> · {activo.tipoActivo.name}
                </p>
              </div>
              <EstadoChip estado={activo.estadoPatrimonial} />
            </div>
            <div className="flex items-end justify-between gap-2 pl-[2.875rem]">
              <div className="min-w-0 text-xs text-muted-foreground">
                <p className="truncate">
                  {activo.sede?.name ?? "Sin sede"}
                  {activo.unidadOperativa && ` · ${activo.unidadOperativa.name}`}
                </p>
                <p className="truncate">
                  {activo.responsableActual ? nombreCompleto(activo.responsableActual) : "Sin asignar"}
                </p>
              </div>
              <ActivoRowActions
                activoId={activo.id}
                nombreActivo={activo.nombreActivo}
                estadoPatrimonial={activo.estadoPatrimonial}
                puedeEliminar={puedeEliminar}
              />
            </div>
          </li>
        ))}
        {activos.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</li>}
      </ul>

      <Table className="max-md:hidden">
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Nombre del activo</TableHead>
            <TableHead>Código y tipo</TableHead>
            <TableHead>Sede</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="max-xl:hidden">Factura / FC</TableHead>
            <TableHead className="pr-6 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activos.map((activo) => (
            <TableRow key={activo.id}>
              <TableCell className="pl-6">
                {/* Nombres de factura muy largos: ancho máximo y hasta 2 líneas
                    con "…"; el nombre completo queda en el title y en el detalle. */}
                <div className="flex max-w-[22rem] min-w-[13rem] items-center gap-2.5">
                  <TipoIcono code={activo.tipoActivo.code} />
                  <div className="min-w-0">
                    <NombreActivo activo={activo} />
                    {activo.subcategoria && (
                      <p className="truncate text-xs text-muted-foreground">{activo.subcategoria.nombre}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <p className="tabular-nums">{activo.codigoPatrimonial}</p>
                <p className="text-xs text-muted-foreground">{activo.tipoActivo.name}</p>
              </TableCell>
              <TableCell className="text-sm">
                <p className="max-w-44 truncate">{activo.sede?.name ?? "Sin sede"}</p>
                <p className="max-w-44 truncate text-xs text-muted-foreground">
                  {activo.unidadOperativa?.name ?? "Sin unidad operativa"}
                </p>
              </TableCell>
              <TableCell className="text-sm">
                {activo.responsableActual ? (
                  <>
                    <p className="max-w-48 truncate">{nombreCompleto(activo.responsableActual)}</p>
                    <p className="max-w-48 truncate text-xs text-muted-foreground">{activo.responsableActual.email}</p>
                  </>
                ) : (
                  <span className="text-muted-foreground">Sin asignar</span>
                )}
              </TableCell>
              <TableCell>
                <EstadoChip estado={activo.estadoPatrimonial} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-xl:hidden">
                <p className="tabular-nums">{activo.numeroFactura ?? "—"}</p>
                {activo.numeroFC && <p className="text-xs">FC {activo.numeroFC}</p>}
              </TableCell>
              <TableCell className="pr-6">
                <ActivoRowActions
                activoId={activo.id}
                nombreActivo={activo.nombreActivo}
                estadoPatrimonial={activo.estadoPatrimonial}
                puedeEliminar={puedeEliminar}
              />
              </TableCell>
            </TableRow>
          ))}
          {activos.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}

function TipoIcono({ code }: { code: TipoActivoCode }) {
  const { icon: Icon, color } = TIPO_ACTIVO_META[code];
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
    >
      <Icon className="size-4" />
    </span>
  );
}

function NombreActivo({ activo }: { activo: ActivoTableRow }) {
  return (
    <Link
      href={`/activos/${activo.id}`}
      title={activo.nombreActivo}
      className="line-clamp-2 text-sm break-words whitespace-normal hover:underline"
    >
      {activo.nombreActivo}
    </Link>
  );
}

function EstadoChip({ estado }: { estado: EstadoPatrimonial }) {
  const color = ESTADO_PATRIMONIAL_COLOR_VAR[estado] ?? "var(--color-neutral)";
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
    >
      {ESTADO_PATRIMONIAL_LABELS[estado] ?? estado}
    </span>
  );
}
