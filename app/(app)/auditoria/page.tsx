import Link from "next/link";
import { Suspense } from "react";
import { CalendarIcon, ScrollTextIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIPO_ACCION_AUDITORIA_LABELS, TIPO_ACCION_AUDITORIA_META } from "@/lib/auditoria/labels";
import { describirDetalleAuditoria, resumenDetalleCrudo } from "@/lib/auditoria/describir-detalle";
import { inicialesPersona, nombreCompleto } from "@/lib/nombre-completo";
import type { Prisma, TipoAccionAuditoria } from "@/lib/generated/prisma/client";
import { AuditoriaFilters } from "./auditoria-filters";

const PAGE_SIZE = 30;
const ACCIONES_DESTRUCTIVAS: TipoAccionAuditoria[] = ["ELIMINAR", "ELIMINAR_DOCUMENTO", "DAR_DE_BAJA"];

// Fase 11 de Activos, restilizada en Fase 32: log de solo lectura,
// filtrable por entidad/acción/usuario/rango de fechas — mismo lenguaje
// visual que /movimientos (Fase 15): stat cards + filtros en vivo + tabla
// con color/ícono por acción. Fase 13 agrega login, pero no restringe esta
// pantalla por rol: ADMIN y SUPER_ADMIN tienen ambos acceso completo salvo
// a la gestión de Usuario (ver CLAUDE.md y proxy.ts).
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    entidad?: string;
    accion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: string;
  }>;
}) {
  const { q, entidad, accion, fechaDesde, fechaHasta, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const filtros: Prisma.AuditoriaLogWhereInput[] = [];
  if (q) {
    filtros.push({
      usuario: {
        OR: [
          { nombres: { contains: q, mode: "insensitive" } },
          { apellidos: { contains: q, mode: "insensitive" } },
        ],
      },
    });
  }
  if (entidad && entidad !== "all") filtros.push({ entidad });
  if (accion && accion !== "all") filtros.push({ accion: accion as TipoAccionAuditoria });
  if (fechaDesde) filtros.push({ fecha: { gte: new Date(`${fechaDesde}T00:00:00`) } });
  if (fechaHasta) filtros.push({ fecha: { lte: new Date(`${fechaHasta}T23:59:59`) } });

  const where: Prisma.AuditoriaLogWhereInput = filtros.length > 0 ? { AND: filtros } : {};

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [logs, total, totalGlobal, hoyGlobal, destructivasGlobal, usuariosDistintos] = await Promise.all([
    prisma.auditoriaLog.findMany({
      where,
      include: { usuario: true },
      orderBy: { fecha: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditoriaLog.count({ where }),
    prisma.auditoriaLog.count(),
    prisma.auditoriaLog.count({ where: { fecha: { gte: startOfDay } } }),
    prisma.auditoriaLog.count({ where: { accion: { in: ACCIONES_DESTRUCTIVAS } } }),
    prisma.auditoriaLog.findMany({
      where: { usuarioId: { not: null } },
      distinct: ["usuarioId"],
      select: { usuarioId: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const porcentaje = (value: number) => (totalGlobal > 0 ? `${Math.round((value / totalGlobal) * 100)}% del total` : "Sin datos");

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Qué hizo el usuario en el sistema — distinto del historial de movimientos de cada activo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de registros"
          value={totalGlobal}
          icon={ScrollTextIcon}
          color="var(--primary)"
          hint="registros históricos"
        />
        <StatCard
          label="Hoy"
          value={hoyGlobal}
          icon={CalendarIcon}
          color="var(--color-good)"
          hint={porcentaje(hoyGlobal)}
        />
        <StatCard
          label="Acciones destructivas"
          value={destructivasGlobal}
          icon={Trash2Icon}
          color="var(--color-critical)"
          hint={porcentaje(destructivasGlobal)}
        />
        <StatCard
          label="Usuarios con actividad"
          value={usuariosDistintos.length}
          icon={UsersIcon}
          color="var(--color-chart-5)"
          hint="con al menos un registro"
        />
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            <AuditoriaFilters />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <p className="text-sm font-medium">Registros encontrados ({total.toLocaleString("es-PE")})</p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="pr-6">Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const meta = TIPO_ACCION_AUDITORIA_META[log.accion];
                const AccionIcon = meta?.icon;
                const color = meta?.color ?? "var(--color-neutral)";

                return (
                  <TableRow key={log.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <div>
                          <p>{log.fecha.toLocaleDateString("es-PE")}</p>
                          <p className="text-xs text-muted-foreground">{log.fecha.toLocaleTimeString("es-PE")}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
                      >
                        {AccionIcon && <AccionIcon className="size-3" />}
                        {TIPO_ACCION_AUDITORIA_LABELS[log.accion] ?? log.accion}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.entidad}</TableCell>
                    <TableCell
                      className="max-w-96 truncate text-sm"
                      title={resumenDetalleCrudo(log.detalle)}
                    >
                      {describirDetalleAuditoria(log.entidad, log.accion, log.detalle)}
                    </TableCell>
                    <TableCell className="pr-6">
                      {log.usuario ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6 shrink-0 rounded-full">
                            <AvatarFallback className="rounded-full bg-muted text-[10px] font-semibold uppercase">
                              {inicialesPersona(log.usuario)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm">{nombreCompleto(log.usuario)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Sin registros que coincidan con el filtro.
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
            Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} registros
          </p>
          <Pagination
            page={page}
            totalPages={totalPages}
            q={q}
            entidad={entidad}
            accion={accion}
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
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
  hint,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString("es-PE")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
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
  q?: string;
  entidad?: string;
  accion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

function buildHref(page: number, filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.entidad) params.set("entidad", filters.entidad);
  if (filters.accion) params.set("accion", filters.accion);
  if (filters.fechaDesde) params.set("fechaDesde", filters.fechaDesde);
  if (filters.fechaHasta) params.set("fechaHasta", filters.fechaHasta);
  params.set("page", String(page));
  return `/auditoria?${params.toString()}`;
}

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
