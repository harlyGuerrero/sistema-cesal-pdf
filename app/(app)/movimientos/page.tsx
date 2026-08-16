import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRightLeftIcon,
  Building2Icon,
  ClipboardListIcon,
  MapPinIcon,
  UserCogIcon,
  UserPlusIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROL_USUARIO_LABELS } from "@/lib/usuarios/labels";
import { TIPO_MOVIMIENTO_OPTIONS } from "@/lib/activos/labels";
import type { Prisma, TipoMovimiento } from "@/lib/generated/prisma/client";
import { MovimientoBadge } from "../movimiento-badge";
import { MovimientoDetalleCell } from "./movimiento-detalle";
import { MovimientosFilters } from "./movimientos-filters";

const PAGE_SIZE = 10;

// Fase 12 de Activos, rediseñada en Fase 15: vista global de movimientos —
// la ficha de un Activo (Fase 9) ya muestra su propio historial, pero esta
// pantalla es la única forma de ver/filtrar movimientos a través de todos
// los activos a la vez. Dirección visual (stat cards + filtros + tabla con
// color/ícono por tipo) tomada de una referencia que el usuario aprobó
// explícitamente tras rechazar dos intentos anteriores — ver CLAUDE.md
// sobre iterar módulo por módulo con criterio propio.
export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{
    tipo?: string;
    sedeId?: string;
    unidadOperativaId?: string;
    q?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const {
    tipo,
    sedeId,
    unidadOperativaId,
    q,
    fechaDesde,
    fechaHasta,
    sort,
    page: pageParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const orderBy: Prisma.MovimientoOrderByWithRelationInput = {
    fecha: sort === "asc" ? "asc" : "desc",
  };

  const filtros: Prisma.MovimientoWhereInput[] = [];
  if (tipo && tipo !== "all") filtros.push({ tipo: tipo as TipoMovimiento });
  if (sedeId && sedeId !== "all") {
    filtros.push({ OR: [{ sedeAnteriorId: sedeId }, { sedeNuevaId: sedeId }] });
  }
  if (unidadOperativaId && unidadOperativaId !== "all") {
    filtros.push({
      OR: [
        { unidadOperativaAnteriorId: unidadOperativaId },
        { unidadOperativaNuevaId: unidadOperativaId },
      ],
    });
  }
  if (q) {
    filtros.push({
      activo: {
        OR: [
          { nombreActivo: { contains: q, mode: "insensitive" } },
          { codigoPatrimonial: { contains: q, mode: "insensitive" } },
        ],
      },
    });
  }
  if (fechaDesde) filtros.push({ fecha: { gte: new Date(`${fechaDesde}T00:00:00`) } });
  if (fechaHasta) filtros.push({ fecha: { lte: new Date(`${fechaHasta}T23:59:59`) } });

  const where: Prisma.MovimientoWhereInput = filtros.length > 0 ? { AND: filtros } : {};

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [movimientos, total, sedes, unidadesOperativas, countsPorTipoMes, totalMes] = await Promise.all([
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
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.movimiento.count({ where }),
    prisma.sede.findMany({ orderBy: { name: "asc" } }),
    prisma.unidadOperativa.findMany({
      include: { sede: true },
      orderBy: [{ sede: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.movimiento.groupBy({ by: ["tipo"], where: { fecha: { gte: startOfMonth } }, _count: true }),
    prisma.movimiento.count({ where: { fecha: { gte: startOfMonth } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countByTipoMes = new Map(countsPorTipoMes.map((row) => [row.tipo, row._count]));

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Movimientos</h1>
        <p className="text-sm text-muted-foreground">
          Historial completo de todos los movimientos realizados a los activos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total de movimientos"
          value={totalMes}
          icon={ClipboardListIcon}
          color="var(--color-chart-1)"
        />
        <StatCard
          label="Asignaciones"
          value={countByTipoMes.get("ASIGNACION") ?? 0}
          icon={UserPlusIcon}
          color="var(--color-good)"
        />
        <StatCard
          label="Reasignaciones"
          value={countByTipoMes.get("REASIGNACION") ?? 0}
          icon={ArrowRightLeftIcon}
          color="var(--color-chart-1)"
        />
        <StatCard
          label="Cambios de responsable"
          value={countByTipoMes.get("CAMBIO_RESPONSABLE") ?? 0}
          icon={UserCogIcon}
          color="var(--color-chart-2)"
        />
        <StatCard
          label="Transferencias de sede"
          value={countByTipoMes.get("TRANSFERENCIA") ?? 0}
          icon={Building2Icon}
          color="var(--color-chart-1)"
        />
        <StatCard
          label="Cambios de ubicación"
          value={countByTipoMes.get("CAMBIO_UBICACION") ?? 0}
          icon={MapPinIcon}
          color="var(--color-chart-5)"
        />
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            <MovimientosFilters
              tiposMovimiento={TIPO_MOVIMIENTO_OPTIONS}
              sedes={sedes}
              unidadesOperativas={unidadesOperativas}
            />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <p className="text-sm font-medium">Historial de movimientos ({total.toLocaleString("es-PE")})</p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Movimiento</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Ubicación actual</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead className="pr-6 text-right">Fecha y hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.map((movimiento) => {
                const sede = movimiento.sedeNueva ?? movimiento.sedeAnterior;
                const unidad = movimiento.unidadOperativaNueva ?? movimiento.unidadOperativaAnterior;

                return (
                  <TableRow key={movimiento.id}>
                    <TableCell className="pl-6">
                      <MovimientoBadge tipo={movimiento.tipo} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/activos/${movimiento.activo.id}`} className="text-sm hover:underline">
                        {movimiento.activo.nombreActivo}
                      </Link>
                      {movimiento.activo.codigoPatrimonial && (
                        <p className="text-xs text-muted-foreground">{movimiento.activo.codigoPatrimonial}</p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-80">
                      <MovimientoDetalleCell movimiento={movimiento} />
                    </TableCell>
                    <TableCell className="text-sm">
                      <p className="font-medium">{sede?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{unidad?.name ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      {movimiento.usuario ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7 shrink-0 rounded-full">
                            <AvatarFallback className="rounded-full bg-muted text-[10px] font-semibold uppercase">
                              {movimiento.usuario.nombre.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm">{movimiento.usuario.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {ROL_USUARIO_LABELS[movimiento.usuario.rol]}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs whitespace-nowrap text-muted-foreground">
                      {movimiento.fecha.toLocaleString("es-PE")}
                    </TableCell>
                  </TableRow>
                );
              })}
              {movimientos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Sin movimientos que coincidan con el filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} movimientos
          </p>
          <Pagination
            page={page}
            totalPages={totalPages}
            tipo={tipo}
            sedeId={sedeId}
            unidadOperativaId={unidadOperativaId}
            q={q}
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            sort={sort}
          />
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString("es-PE")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Este mes</p>
        </div>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
        >
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

interface FilterState {
  tipo?: string;
  sedeId?: string;
  unidadOperativaId?: string;
  q?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  sort?: string;
}

function buildHref(page: number, filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.tipo) params.set("tipo", filters.tipo);
  if (filters.sedeId) params.set("sedeId", filters.sedeId);
  if (filters.unidadOperativaId) params.set("unidadOperativaId", filters.unidadOperativaId);
  if (filters.q) params.set("q", filters.q);
  if (filters.fechaDesde) params.set("fechaDesde", filters.fechaDesde);
  if (filters.fechaHasta) params.set("fechaHasta", filters.fechaHasta);
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/movimientos?${params.toString()}`;
}

// Ventana de números de página con elipsis (1 … 4 5 [6] 7 8 … 13) — nunca
// más de 7 elementos visibles para que no desborde en pantallas angostas.
function pageWindow(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("ellipsis");
    result.push(sorted[i]);
  }
  return result;
}

function Pagination({
  page,
  totalPages,
  ...filters
}: { page: number; totalPages: number } & FilterState) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <PageButton disabled={page <= 1} href={buildHref(page - 1, filters)}>
        «
      </PageButton>
      {pageWindow(page, totalPages).map((entry, index) =>
        entry === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1.5 text-muted-foreground">
            …
          </span>
        ) : (
          <PageButton key={entry} href={buildHref(entry, filters)} active={entry === page}>
            {entry}
          </PageButton>
        )
      )}
      <PageButton disabled={page >= totalPages} href={buildHref(page + 1, filters)}>
        »
      </PageButton>
    </div>
  );
}

function PageButton({
  children,
  href,
  active,
  disabled,
}: {
  children: React.ReactNode;
  href: string;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = `flex size-7 shrink-0 items-center justify-center rounded-md text-sm ${
    active
      ? "bg-primary text-primary-foreground"
      : disabled
        ? "text-muted-foreground/50"
        : "text-foreground hover:bg-muted"
  }`;
  if (disabled) return <span className={className}>{children}</span>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
