import Link from "next/link";
import { Suspense } from "react";
import { CircleIcon, PlusIcon, ShieldIcon, UserCheckIcon, UserCogIcon, UsersIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
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
import { ROL_USUARIO_LABELS, ROL_USUARIO_META } from "@/lib/usuarios/labels";
import type { Prisma, RolUsuario } from "@/lib/generated/prisma/client";
import { UsuariosFilters } from "./usuarios-filters";
import { UsuarioRowActions } from "./usuario-row-actions";

const PAGE_SIZE = 10;

// Fase 29: rediseño visual de /usuarios — misma dirección que /activos
// (Fase 19): stat cards + filtros en vivo + tabla con color/ícono por rol,
// reusando StatCard/Pagination/Card-table del mismo patrón (ver
// activos/page.tsx) en vez de inventar uno nuevo para este módulo.
export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rol?: string; estado?: string; page?: string }>;
}) {
  const actor = await requireSuperAdmin();
  const { q, rol, estado, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.UsuarioWhereInput = {
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(rol && rol !== "all" ? { rol: rol as RolUsuario } : {}),
    ...(estado && estado !== "all" ? { estado: estado === "true" } : {}),
  };

  const [usuarios, total, totalGlobal, countsPorRol, activosGlobal] = await Promise.all([
    prisma.usuario.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.usuario.count({ where }),
    prisma.usuario.count(),
    prisma.usuario.groupBy({ by: ["rol"], _count: true }),
    prisma.usuario.count({ where: { estado: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countByRol = new Map(countsPorRol.map((row) => [row.rol, row._count]));
  const porcentaje = (value: number) => (totalGlobal > 0 ? `${Math.round((value / totalGlobal) * 100)}% del total` : "Sin datos");

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Quién opera el sistema y con qué rol.</p>
        </div>
        <Button render={<Link href="/usuarios/nuevo" />} nativeButton={false}>
          <PlusIcon />
          Nuevo usuario
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de usuarios"
          value={totalGlobal}
          icon={UsersIcon}
          color="var(--primary)"
          hint="usuarios registrados"
        />
        <StatCard
          label="Usuarios activos"
          value={activosGlobal}
          icon={UserCheckIcon}
          color="var(--color-good)"
          hint={porcentaje(activosGlobal)}
        />
        <StatCard
          label="Super administradores"
          value={countByRol.get("SUPER_ADMIN") ?? 0}
          icon={ShieldIcon}
          color="var(--primary)"
          hint={porcentaje(countByRol.get("SUPER_ADMIN") ?? 0)}
        />
        <StatCard
          label="Administradores"
          value={countByRol.get("ADMIN") ?? 0}
          icon={UserCogIcon}
          color="var(--color-chart-5)"
          hint={porcentaje(countByRol.get("ADMIN") ?? 0)}
        />
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            <UsuariosFilters />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <p className="text-sm font-medium">Usuarios encontrados ({total.toLocaleString("es-PE")})</p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-6 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((usuario) => {
                const rolMeta = ROL_USUARIO_META[usuario.rol];
                const RolIcon = rolMeta.icon;

                return (
                  <TableRow key={usuario.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 shrink-0 rounded-full">
                          <AvatarFallback
                            className="rounded-full text-xs font-semibold uppercase"
                            style={{
                              backgroundColor: `color-mix(in oklch, ${rolMeta.color} 15%, transparent)`,
                              color: rolMeta.color,
                            }}
                          >
                            {usuario.nombre.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <Link href={`/usuarios/${usuario.id}`} className="truncate text-sm hover:underline">
                          {usuario.nombre}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{usuario.email}</TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `color-mix(in oklch, ${rolMeta.color} 15%, transparent)`,
                          color: rolMeta.color,
                        }}
                      >
                        <RolIcon className="size-3" />
                        {ROL_USUARIO_LABELS[usuario.rol]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: usuario.estado
                            ? "color-mix(in oklch, var(--color-good) 15%, transparent)"
                            : "color-mix(in oklch, var(--color-neutral) 15%, transparent)",
                          color: usuario.estado ? "var(--color-good)" : "var(--color-neutral)",
                        }}
                      >
                        <CircleIcon className="size-2 fill-current" />
                        {usuario.estado ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <UsuarioRowActions
                        usuarioId={usuario.id}
                        nombre={usuario.nombre}
                        esUsuarioActual={actor.id === usuario.id}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {usuarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay usuarios que coincidan con el filtro.
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
            Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} usuarios
          </p>
          <Pagination page={page} totalPages={totalPages} q={q} rol={rol} estado={estado} />
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
  rol?: string;
  estado?: string;
}

function buildHref(page: number, filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.rol) params.set("rol", filters.rol);
  if (filters.estado) params.set("estado", filters.estado);
  params.set("page", String(page));
  return `/usuarios?${params.toString()}`;
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
