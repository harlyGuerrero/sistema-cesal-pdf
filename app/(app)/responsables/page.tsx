import Link from "next/link";
import { Suspense } from "react";
import { Building2Icon, CircleIcon, PackageIcon, PlusIcon, UserCheckIcon, UsersIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
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
import { inicialesPersona, nombreCompleto } from "@/lib/nombre-completo";
import type { Prisma } from "@/lib/generated/prisma/client";
import { ResponsablesFilters } from "./responsables-filters";
import { ResponsableRowActions } from "./responsable-row-actions";

const PAGE_SIZE = 10;

// Fase 30: rediseño visual de /responsables — mismo patrón que /usuarios
// (Fase 29) y /activos (Fase 19): stat cards + filtros en vivo + tabla con
// avatar/badges, reusando StatCard/Pagination/Card-table en vez de un
// diseño nuevo. Sin color por fila (a diferencia de Usuarios/rol o
// Activos/tipo): Responsable no tiene un campo cerrado análogo a colorear —
// forzar uno acá sería inventar una categoría que no existe en el dato.
export default async function ResponsablesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sedeId?: string; estado?: string; page?: string }>;
}) {
  const { q, sedeId, estado, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.ResponsableWhereInput = {
    ...(q
      ? {
          OR: [
            { nombres: { contains: q, mode: "insensitive" } },
            { apellidos: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(sedeId && sedeId !== "all" ? { sedeId } : {}),
    ...(estado && estado !== "all" ? { estado: estado === "true" } : {}),
  };

  const [responsables, total, sedes, totalGlobal, activosGlobal, conActivosAsignados, sinSede] =
    await Promise.all([
      prisma.responsable.findMany({
        where,
        include: { sede: true, _count: { select: { activos: true } } },
        orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.responsable.count({ where }),
      prisma.sede.findMany({ orderBy: { name: "asc" } }),
      prisma.responsable.count(),
      prisma.responsable.count({ where: { estado: true } }),
      prisma.responsable.count({ where: { activos: { some: {} } } }),
      prisma.responsable.count({ where: { sedeId: null } }),
    ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const porcentaje = (value: number) => (totalGlobal > 0 ? `${Math.round((value / totalGlobal) * 100)}% del total` : "Sin datos");

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Responsables</h1>
          <p className="text-sm text-muted-foreground">Personas a las que se les puede asignar activos.</p>
        </div>
        <Button render={<Link href="/responsables/nuevo" />} nativeButton={false}>
          <PlusIcon />
          Nuevo responsable
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de responsables"
          value={totalGlobal}
          icon={UsersIcon}
          color="var(--primary)"
          hint="responsables registrados"
        />
        <StatCard
          label="Responsables activos"
          value={activosGlobal}
          icon={UserCheckIcon}
          color="var(--color-good)"
          hint={porcentaje(activosGlobal)}
        />
        <StatCard
          label="Con activos asignados"
          value={conActivosAsignados}
          icon={PackageIcon}
          color="var(--color-chart-2)"
          hint={porcentaje(conActivosAsignados)}
        />
        <StatCard
          label="Sin sede asignada"
          value={sinSede}
          icon={Building2Icon}
          color="var(--color-warning)"
          hint={porcentaje(sinSede)}
        />
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            <ResponsablesFilters sedes={sedes} />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <p className="text-sm font-medium">Responsables encontrados ({total.toLocaleString("es-PE")})</p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Activos asignados</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-6 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responsables.map((responsable) => (
                <TableRow key={responsable.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8 shrink-0 rounded-full">
                        <AvatarFallback className="rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
                          {inicialesPersona(responsable)}
                        </AvatarFallback>
                      </Avatar>
                      <Link href={`/responsables/${responsable.id}`} className="truncate text-sm hover:underline">
                        {nombreCompleto(responsable)}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{responsable.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{responsable.cargo ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{responsable.sede?.name ?? "Sin sede"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <PackageIcon className="size-3.5 text-muted-foreground" />
                      {responsable._count.activos}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: responsable.estado
                          ? "color-mix(in oklch, var(--color-good) 15%, transparent)"
                          : "color-mix(in oklch, var(--color-neutral) 15%, transparent)",
                        color: responsable.estado ? "var(--color-good)" : "var(--color-neutral)",
                      }}
                    >
                      <CircleIcon className="size-2 fill-current" />
                      {responsable.estado ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <ResponsableRowActions responsableId={responsable.id} nombre={nombreCompleto(responsable)} />
                  </TableCell>
                </TableRow>
              ))}
              {responsables.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay responsables que coincidan con el filtro.
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
            Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} responsables
          </p>
          <Pagination page={page} totalPages={totalPages} q={q} sedeId={sedeId} estado={estado} />
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
  sedeId?: string;
  estado?: string;
}

function buildHref(page: number, filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.sedeId) params.set("sedeId", filters.sedeId);
  if (filters.estado) params.set("estado", filters.estado);
  params.set("page", String(page));
  return `/responsables?${params.toString()}`;
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
