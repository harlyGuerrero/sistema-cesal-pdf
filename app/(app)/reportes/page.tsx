import Link from "next/link";
import { Suspense } from "react";
import { Building2Icon, CoinsIcon, DownloadIcon, PackageIcon, TagIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ESTADO_PATRIMONIAL_COLOR_VAR, ESTADO_PATRIMONIAL_LABELS } from "@/lib/activos/labels";
import { TIPO_ACTIVO_META } from "@/lib/activos/tipo-activo-meta";
import { nombreCompleto } from "@/lib/nombre-completo";
import { buildReportesWhere, buildReporteMatriz } from "@/lib/activos/reportes";
import { ReportesFilters } from "./reportes-filters";

const PAGE_SIZE = 30;

function formatMoney(value: number): string {
  return `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Fase 12 de Activos, restilizada en Fase 34: reporte de inventario por
// ubicación y tipo. Sin sede elegida, agrupa por Sede; con una sede elegida,
// "entra" un nivel y agrupa por Unidad Operativa dentro de ella — mismo
// patrón de drill-down que Sede -> Unidad Operativa -> Ambiente del resto
// del sistema (Fase 5). El rediseño reusa TIPO_ACTIVO_META/ESTADO_-
// PATRIMONIAL_COLOR_VAR (mismos colores que /activos) para que un tipo o un
// estado se vean igual acá que en el resto del sistema, y agrega valor
// contable total — la única stat que tiene sentido en un reporte y no en
// ningún otro módulo.
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{
    sedeId?: string;
    tipoActivoId?: string;
    estado?: string;
    page?: string;
  }>;
}) {
  const { sedeId, tipoActivoId, estado, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const filterWhere = buildReportesWhere({ sedeId, tipoActivoId, estado });

  const [sedes, tiposActivo] = await Promise.all([
    prisma.sede.findMany({ orderBy: { name: "asc" } }),
    prisma.tipoActivo.findMany(),
  ]);
  const tipoActivoById = new Map(tiposActivo.map((tipo) => [tipo.id, tipo]));

  const [{ columnas, filas, totalesPorColumna, totalGeneral, sedeSeleccionada }, detalle, totalDetalle, sedesRepresentadas, tiposRepresentados, valorContable] =
    await Promise.all([
      buildReporteMatriz(filterWhere, { sedeId, tipoActivoId, estado }),
      prisma.activo.findMany({
        where: filterWhere,
        include: { tipoActivo: true, sede: true, unidadOperativa: true, ambiente: true, responsableActual: true },
        orderBy: { nombreActivo: "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.activo.count({ where: filterWhere }),
      prisma.activo.groupBy({ by: ["sedeId"], where: { ...filterWhere, sedeId: { not: null } }, _count: true }),
      prisma.activo.groupBy({ by: ["tipoActivoId"], where: filterWhere, _count: true }),
      prisma.activo.aggregate({ where: filterWhere, _sum: { valorContable: true } }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalDetalle / PAGE_SIZE));

  const exportParams = new URLSearchParams();
  if (sedeId) exportParams.set("sedeId", sedeId);
  if (tipoActivoId) exportParams.set("tipoActivoId", tipoActivoId);
  if (estado) exportParams.set("estado", estado);
  const exportQs = exportParams.toString();
  const exportHref = exportQs ? `/api/reportes/export?${exportQs}` : "/api/reportes/export";

  return (
    <main className="space-y-6 p-6 print:p-8">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-medium">Reportes</h1>
          <p className="text-sm text-muted-foreground">Inventario de activos por ubicación y tipo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="w-full sm:w-auto" render={<a href={exportHref} />} nativeButton={false}>
            <DownloadIcon />
            Exportar a Excel
          </Button>
          <PrintButton className="w-full sm:w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <StatCard label="Activos filtrados" value={totalDetalle} icon={PackageIcon} color="var(--primary)" hint="según filtros aplicados" />
        <StatCard
          label="Sedes representadas"
          value={sedesRepresentadas.length}
          icon={Building2Icon}
          color="var(--color-good)"
          hint={`de ${sedes.length} sedes`}
        />
        <StatCard
          label="Tipos representados"
          value={tiposRepresentados.length}
          icon={TagIcon}
          color="var(--color-chart-2)"
          hint={`de ${tiposActivo.length} tipos`}
        />
        <StatCard
          label="Valor contable"
          value={formatMoney(Number(valorContable._sum.valorContable ?? 0))}
          icon={CoinsIcon}
          color="var(--color-chart-4)"
          hint="suma del filtro actual"
        />
      </div>

      <Card className="print:hidden">
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            <ReportesFilters sedes={sedes} tiposActivo={tiposActivo} />
          </Suspense>
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader>
          <p className="text-sm font-medium">
            {sedeSeleccionada ? `Inventario en ${sedeSeleccionada.name} por unidad operativa` : "Inventario por sede"}
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{sedeSeleccionada ? "Unidad operativa" : "Sede"}</TableHead>
                {columnas.map((tipo) => {
                  const { icon: Icon, color } = TIPO_ACTIVO_META[tipo.code];
                  return (
                    <TableHead key={tipo.id} className="text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <Icon className="size-3.5" style={{ color }} />
                        {tipo.name}
                      </span>
                    </TableHead>
                  );
                })}
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => (
                <TableRow key={fila.key}>
                  <TableCell>{fila.label}</TableCell>
                  {fila.counts.map((count, i) => (
                    <TableCell key={columnas[i].id} className="text-right tabular-nums">
                      {count.toLocaleString("es-PE")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fila.total.toLocaleString("es-PE")}
                  </TableCell>
                </TableRow>
              ))}
              {filas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnas.length + 2} className="text-center text-muted-foreground">
                    Sin activos que coincidan con el filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {filas.length > 0 && (
              <tfoot>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  {totalesPorColumna.map((total, i) => (
                    <TableCell key={columnas[i].id} className="text-right font-semibold tabular-nums">
                      {total.toLocaleString("es-PE")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {totalGeneral.toLocaleString("es-PE")}
                  </TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </CardContent>
      </Card>

      <Card className="break-before-page">
        <CardHeader>
          <p className="text-sm font-medium">Detalle de activos ({totalDetalle.toLocaleString("es-PE")})</p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="pr-6">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detalle.map((activo) => {
                const estadoColor = ESTADO_PATRIMONIAL_COLOR_VAR[activo.estadoPatrimonial] ?? "var(--color-neutral)";
                return (
                  <TableRow key={activo.id}>
                    <TableCell className="pl-6 text-sm text-muted-foreground">{activo.codigoPatrimonial ?? "—"}</TableCell>
                    <TableCell>
                      <Link href={`/activos/${activo.id}`} className="hover:underline print:no-underline">
                        {activo.nombreActivo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tipoActivoById.get(activo.tipoActivoId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[activo.sede?.name, activo.unidadOperativa?.name, activo.ambiente?.name]
                        .filter(Boolean)
                        .join(" › ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {activo.responsableActual ? nombreCompleto(activo.responsableActual) : "—"}
                    </TableCell>
                    <TableCell className="pr-6">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `color-mix(in oklch, ${estadoColor} 15%, transparent)`, color: estadoColor }}
                      >
                        {ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial]}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {detalle.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Sin activos que coincidan con el filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground print:hidden">
          <p>
            Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, totalDetalle)} de {totalDetalle} activos
          </p>
          <Pagination page={page} totalPages={totalPages} sedeId={sedeId} tipoActivoId={tipoActivoId} estado={estado} />
        </div>
      )}

      <footer className="hidden border-t pt-3 text-xs text-muted-foreground print:block">
        Generado el {new Date().toLocaleDateString("es-PE")} — CESAL, sistema de gestión patrimonial.
      </footer>
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
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {typeof value === "number" ? value.toLocaleString("es-PE") : value}
          </p>
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
  sedeId?: string;
  tipoActivoId?: string;
  estado?: string;
}

function buildHref(page: number, filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.sedeId) params.set("sedeId", filters.sedeId);
  if (filters.tipoActivoId) params.set("tipoActivoId", filters.tipoActivoId);
  if (filters.estado) params.set("estado", filters.estado);
  params.set("page", String(page));
  return `/reportes?${params.toString()}`;
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
