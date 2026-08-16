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
  estadoPatrimonial: EstadoPatrimonial;
  tipoActivo: { code: TipoActivoCode; name: string };
  sede: { name: string } | null;
  unidadOperativa: { name: string } | null;
  subcategoria: { nombre: string } | null;
  responsableActual: { nombres: string; apellidos: string; email: string } | null;
}

const COLUMN_COUNT = 8;

// Fase 25: tabla de Activos extraída de /activos (Fase 19) para reusarla tal
// cual en el Dashboard ("Activos recientes") — mismo ícono por categoría
// patrimonial, mismo chip de color por estado, mismas acciones por fila. Un
// único lugar para no divergir visualmente entre ambas pantallas.
export function ActivosTable({
  activos,
  emptyMessage = "No hay activos que coincidan con el filtro.",
}: {
  activos: ActivoTableRow[];
  emptyMessage?: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Nombre del activo</TableHead>
          <TableHead>Tipo de activo</TableHead>
          <TableHead>Sede</TableHead>
          <TableHead>Responsable</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Código patrimonial</TableHead>
          <TableHead>N° de factura</TableHead>
          <TableHead className="pr-6 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activos.map((activo) => {
          const { icon: Icon, color } = TIPO_ACTIVO_META[activo.tipoActivo.code];
          const estadoColor = ESTADO_PATRIMONIAL_COLOR_VAR[activo.estadoPatrimonial] ?? "var(--color-neutral)";

          return (
            <TableRow key={activo.id}>
              <TableCell className="pl-6">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <Link href={`/activos/${activo.id}`} className="block truncate text-sm hover:underline">
                      {activo.nombreActivo}
                    </Link>
                    {activo.subcategoria && (
                      <p className="truncate text-xs text-muted-foreground">{activo.subcategoria.nombre}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{activo.tipoActivo.name}</TableCell>
              <TableCell className="text-sm">
                <p>{activo.sede?.name ?? "Sin sede"}</p>
                <p className="text-xs text-muted-foreground">{activo.unidadOperativa?.name ?? "Sin unidad operativa"}</p>
              </TableCell>
              <TableCell className="text-sm">
                {activo.responsableActual ? (
                  <>
                    <p>{nombreCompleto(activo.responsableActual)}</p>
                    <p className="truncate text-xs text-muted-foreground">{activo.responsableActual.email}</p>
                  </>
                ) : (
                  <span className="text-muted-foreground">Sin asignar</span>
                )}
              </TableCell>
              <TableCell>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: `color-mix(in oklch, ${estadoColor} 15%, transparent)`, color: estadoColor }}
                >
                  {ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial] ?? activo.estadoPatrimonial}
                </span>
              </TableCell>
              <TableCell className="text-sm tabular-nums">{activo.codigoPatrimonial}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{activo.numeroFactura ?? "—"}</TableCell>
              <TableCell className="pr-6">
                <ActivoRowActions activoId={activo.id} nombreActivo={activo.nombreActivo} />
              </TableCell>
            </TableRow>
          );
        })}
        {activos.length === 0 && (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
