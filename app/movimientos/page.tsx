import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIPO_MOVIMIENTO_LABELS, TIPO_MOVIMIENTO_OPTIONS } from "@/lib/activos/labels";
import { describirMovimiento } from "@/lib/activos/movimientos";
import type { Prisma, TipoMovimiento } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 30;

// Fase 12 de Activos: vista global de movimientos — la ficha de un Activo
// (Fase 9, ver historial-section.tsx) ya muestra su propio historial, pero
// no existía una forma de ver/filtrar movimientos a través de todos los
// activos a la vez (ej. "qué se transfirió esta semana", "qué dio de baja
// tal sede"). Reusa describirMovimiento para no duplicar la lógica de
// "qué cambió" entre esta pantalla y la ficha.
export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; sedeId?: string; q?: string; page?: string }>;
}) {
  const { tipo, sedeId, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.MovimientoWhereInput = {
    ...(tipo && tipo !== "all" ? { tipo: tipo as TipoMovimiento } : {}),
    ...(sedeId && sedeId !== "all"
      ? { OR: [{ sedeAnteriorId: sedeId }, { sedeNuevaId: sedeId }] }
      : {}),
    ...(q
      ? {
          activo: {
            OR: [
              { nombreActivo: { contains: q, mode: "insensitive" } },
              { codigoPatrimonial: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [movimientos, total, sedes] = await Promise.all([
    prisma.movimiento.findMany({
      where,
      include: {
        activo: { select: { id: true, nombreActivo: true, codigoPatrimonial: true } },
        usuario: true,
        responsableAnterior: true,
        responsableNuevo: true,
        sedeAnterior: true,
        sedeNueva: true,
        unidadOperativaAnterior: true,
        unidadOperativaNueva: true,
        ambienteAnterior: true,
        ambienteNuevo: true,
      },
      orderBy: { fecha: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.movimiento.count({ where }),
    prisma.sede.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Movimientos</h1>
        <p className="text-sm text-muted-foreground">
          Historial de movimientos de todos los activos — para ver solo los de uno, entra a su ficha.
        </p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por activo o código..."
          className="w-64"
        />
        <Select name="tipo" defaultValue={tipo ?? "all"}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {TIPO_MOVIMIENTO_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="sedeId" defaultValue={sedeId ?? "all"}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las sedes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sedes</SelectItem>
            {sedes.map((sede) => (
              <SelectItem key={sede.id} value={sede.id}>
                {sede.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Activo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead>Usuario</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimientos.map((movimiento) => {
            const detalle = describirMovimiento(movimiento).join(" · ");
            return (
              <TableRow key={movimiento.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {movimiento.fecha.toLocaleString("es-PE")}
                </TableCell>
                <TableCell>
                  <Link href={`/activos/${movimiento.activo.id}`} className="hover:underline">
                    {movimiento.activo.nombreActivo}
                  </Link>
                  {movimiento.activo.codigoPatrimonial && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({movimiento.activo.codigoPatrimonial})
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{TIPO_MOVIMIENTO_LABELS[movimiento.tipo] ?? movimiento.tipo}</Badge>
                </TableCell>
                <TableCell className="max-w-96 truncate text-sm text-muted-foreground" title={detalle}>
                  {detalle || "—"}
                  {movimiento.motivo && (
                    <span className="italic"> — {movimiento.motivo}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{movimiento.usuario?.nombre ?? "—"}</TableCell>
              </TableRow>
            );
          })}
          {movimientos.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Sin movimientos que coincidan con el filtro.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <PageLink page={page - 1} disabled={page <= 1} tipo={tipo} sedeId={sedeId} q={q}>
            Anterior
          </PageLink>
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages} tipo={tipo} sedeId={sedeId} q={q}>
            Siguiente
          </PageLink>
        </div>
      )}
    </main>
  );
}

function PageLink({
  page,
  disabled,
  tipo,
  sedeId,
  q,
  children,
}: {
  page: number;
  disabled: boolean;
  tipo?: string;
  sedeId?: string;
  q?: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-muted-foreground">{children}</span>;
  }
  const params = new URLSearchParams();
  if (tipo) params.set("tipo", tipo);
  if (sedeId) params.set("sedeId", sedeId);
  if (q) params.set("q", q);
  params.set("page", String(page));
  return (
    <Link href={`/movimientos?${params.toString()}`} className="hover:underline">
      {children}
    </Link>
  );
}
