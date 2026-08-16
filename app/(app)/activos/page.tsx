import Link from "next/link";
import { Suspense } from "react";
import { ArchiveIcon, CheckCircle2Icon, PlusIcon, Trash2Icon, UserIcon, WrenchIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { EstadoPatrimonial, Prisma } from "@/lib/generated/prisma/client";
import { ActivosFilters } from "./activos-filters";
import { ActivosTable } from "./activos-table";

const PAGE_SIZE = 10;

// Fase 19: rediseño visual de /activos — misma dirección que /movimientos
// (Fase 15): stat cards + filtros en vivo + tabla con color/ícono, con
// detalles propios de este módulo: el ícono de cada fila es por categoría
// patrimonial (TipoActivoCode), no por nombre de producto — ver
// lib/activos/tipo-activo-meta.ts sobre por qué (regla 3 de CLAUDE.md).
export default async function ActivosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tipoActivoId?: string;
    sedeId?: string;
    estadoPatrimonial?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { q, tipoActivoId, sedeId, estadoPatrimonial, sort, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.ActivoWhereInput = {
    ...(q
      ? {
          OR: [
            { nombreNormalizado: { contains: q, mode: "insensitive" } },
            { codigoPatrimonial: { contains: q, mode: "insensitive" } },
            { numeroFactura: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(tipoActivoId && tipoActivoId !== "all" ? { tipoActivoId } : {}),
    ...(sedeId && sedeId !== "all" ? { sedeId } : {}),
    ...(estadoPatrimonial && estadoPatrimonial !== "all"
      ? { estadoPatrimonial: estadoPatrimonial as EstadoPatrimonial }
      : {}),
  };

  const orderBy: Prisma.ActivoOrderByWithRelationInput =
    sort === "antiguos" ? { updatedAt: "asc" } : sort === "nombre" ? { nombreActivo: "asc" } : { updatedAt: "desc" };

  const [activos, total, tiposActivo, sedes, totalGlobal, countsPorEstado] = await Promise.all([
    prisma.activo.findMany({
      where,
      include: {
        tipoActivo: true,
        sede: true,
        unidadOperativa: true,
        subcategoria: true,
        responsableActual: true,
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.activo.count({ where }),
    prisma.tipoActivo.findMany({ orderBy: { name: "asc" } }),
    prisma.sede.findMany({ orderBy: { name: "asc" } }),
    prisma.activo.count(),
    prisma.activo.groupBy({ by: ["estadoPatrimonial"], _count: true }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countByEstado = new Map(countsPorEstado.map((row) => [row.estadoPatrimonial, row._count]));
  const porcentaje = (value: number) => (totalGlobal > 0 ? `${Math.round((value / totalGlobal) * 100)}% del total` : "Sin datos");

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Activos</h1>
          <p className="text-sm text-muted-foreground">Gestiona y consulta todos los activos registrados en el sistema.</p>
        </div>
        <Button render={<Link href="/activos/nuevo" />} nativeButton={false}>
          <PlusIcon />
          Nuevo activo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total de activos" value={totalGlobal} icon={ArchiveIcon} color="var(--primary)" hint="100% del patrimonio" />
        <StatCard
          label="Disponibles"
          value={countByEstado.get("DISPONIBLE") ?? 0}
          icon={CheckCircle2Icon}
          color="var(--color-good)"
          hint={porcentaje(countByEstado.get("DISPONIBLE") ?? 0)}
        />
        <StatCard
          label="Asignados"
          value={countByEstado.get("ASIGNADO") ?? 0}
          icon={UserIcon}
          color="var(--primary)"
          hint={porcentaje(countByEstado.get("ASIGNADO") ?? 0)}
        />
        <StatCard
          label="En mantenimiento"
          value={countByEstado.get("MANTENIMIENTO") ?? 0}
          icon={WrenchIcon}
          color="var(--color-warning)"
          hint={porcentaje(countByEstado.get("MANTENIMIENTO") ?? 0)}
        />
        <StatCard
          label="Dados de baja"
          value={countByEstado.get("BAJA") ?? 0}
          icon={Trash2Icon}
          color="var(--color-critical)"
          hint={porcentaje(countByEstado.get("BAJA") ?? 0)}
        />
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            <ActivosFilters tiposActivo={tiposActivo} sedes={sedes} />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <p className="text-sm font-medium">Activos encontrados ({total.toLocaleString("es-PE")})</p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <ActivosTable activos={activos} />
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} activos
          </p>
          <Pagination
            page={page}
            totalPages={totalPages}
            q={q}
            tipoActivoId={tipoActivoId}
            sedeId={sedeId}
            estadoPatrimonial={estadoPatrimonial}
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
  tipoActivoId?: string;
  sedeId?: string;
  estadoPatrimonial?: string;
  sort?: string;
}

function buildHref(page: number, filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.tipoActivoId) params.set("tipoActivoId", filters.tipoActivoId);
  if (filters.sedeId) params.set("sedeId", filters.sedeId);
  if (filters.estadoPatrimonial) params.set("estadoPatrimonial", filters.estadoPatrimonial);
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/activos?${params.toString()}`;
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
