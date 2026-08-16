import Link from "next/link";
import {
  CalendarIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  ClockIcon,
  FileTextIcon,
  InfoIcon,
  PackageIcon,
  ReceiptTextIcon,
  ShieldIcon,
  UploadCloudIcon,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IMPORT_STATUS_LABELS, IMPORT_STATUS_META } from "@/lib/import-workflow/labels";
import { UploadImportDialog } from "./upload-import-dialog";

const PAGE_SIZE = 10;

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Fase 20: rediseño visual de /importaciones — misma dirección que
// /movimientos (Fase 15) y /activos (Fase 19): stat cards + tabla con
// color/ícono por estado. Sin filtros en vivo todavía: a diferencia de esas
// dos pantallas, acá no hay un criterio de filtro claro más allá de la
// paginación (no hay tipo/sede que filtrar), así que no se agregó una barra
// que no tuviera nada real que filtrar.
export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [imports, total, countsPorEstado, procesados] = await Promise.all([
    prisma.import.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.import.count(),
    prisma.import.groupBy({ by: ["status"], _count: true }),
    prisma.import.findMany({
      where: { processedAt: { not: null } },
      select: { createdAt: true, processedAt: true },
    }),
  ]);

  const importIds = imports.map((item) => item.id);
  const itemStats =
    importIds.length > 0
      ? await prisma.importItem.groupBy({
          by: ["importId", "relevance", "status"],
          where: { importId: { in: importIds } },
          _count: true,
        })
      : [];

  const statsByImport = new Map<string, { products: number; pendingReview: number }>();
  for (const id of importIds) statsByImport.set(id, { products: 0, pendingReview: 0 });
  for (const row of itemStats) {
    const stats = statsByImport.get(row.importId);
    if (!stats) continue;
    if (row.relevance === "PRODUCT") stats.products += row._count;
    if (row.status === "REVIEW_REQUIRED") stats.pendingReview += row._count;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countByEstado = new Map(countsPorEstado.map((row) => [row.status, row._count]));
  const completadas = countByEstado.get("COMPLETED") ?? 0;
  const conErrores = countByEstado.get("FAILED") ?? 0;
  const porcentaje = (value: number) => (total > 0 ? `${Math.round((value / total) * 100)}% del total` : "Sin datos");

  const avgDurationMs =
    procesados.length > 0
      ? procesados.reduce((sum, row) => sum + (row.processedAt!.getTime() - row.createdAt.getTime()), 0) /
        procesados.length
      : null;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UploadCloudIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-medium">Importaciones</h1>
            <p className="text-sm text-muted-foreground">
              Aquí puedes revisar el historial de importaciones realizadas al sistema.
            </p>
          </div>
        </div>
        <UploadImportDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total importaciones"
          value={total.toLocaleString("es-PE")}
          icon={FileTextIcon}
          color="var(--primary)"
          hint="Historial completo"
        />
        <StatCard
          label="Completadas"
          value={completadas.toLocaleString("es-PE")}
          icon={CheckCircle2Icon}
          color="var(--color-good)"
          hint={porcentaje(completadas)}
        />
        <StatCard
          label="Con errores"
          value={conErrores.toLocaleString("es-PE")}
          icon={CircleAlertIcon}
          color="var(--color-critical)"
          hint={porcentaje(conErrores)}
        />
        <StatCard
          label="Tiempo promedio"
          value={formatDuration(avgDurationMs)}
          icon={ClockIcon}
          color="var(--color-neutral)"
          hint="Duración promedio"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <p className="text-sm font-medium">Importaciones registradas ({total.toLocaleString("es-PE")})</p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Archivo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Revisión</TableHead>
                <TableHead>Errores</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead className="pr-6 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map((importRecord) => {
                const stats = statsByImport.get(importRecord.id) ?? { products: 0, pendingReview: 0 };
                const durationMs = importRecord.processedAt
                  ? importRecord.processedAt.getTime() - importRecord.createdAt.getTime()
                  : null;
                const statusMeta = IMPORT_STATUS_META[importRecord.status] ?? IMPORT_STATUS_META.UPLOADED;
                const StatusIcon = statusMeta.icon;

                return (
                  <TableRow key={importRecord.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: "color-mix(in oklch, var(--color-critical) 12%, transparent)",
                            color: "var(--color-critical)",
                          }}
                        >
                          <FileTextIcon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-56 truncate text-sm font-medium" title={importRecord.fileName}>
                            {importRecord.fileName}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            {formatFileSize(importRecord.fileSize)}
                            {importRecord.numeroFactura && (
                              <>
                                <span aria-hidden>·</span>
                                <ReceiptTextIcon className="size-3 shrink-0" />
                                <span className="max-w-28 truncate" title={importRecord.numeroFactura}>
                                  {importRecord.numeroFactura}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <div>
                          <p>{importRecord.createdAt.toLocaleDateString("es-PE")}</p>
                          <p className="text-xs text-muted-foreground">
                            {importRecord.createdAt.toLocaleTimeString("es-PE")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `color-mix(in oklch, ${statusMeta.color} 15%, transparent)`,
                          color: statusMeta.color,
                        }}
                      >
                        <StatusIcon className="size-3" />
                        {IMPORT_STATUS_LABELS[importRecord.status] ?? importRecord.status}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">{statusMeta.hint}</p>
                    </TableCell>
                    <TableCell>
                      <MetricCell icon={PackageIcon} color="var(--primary)" value={stats.products} label="productos" />
                    </TableCell>
                    <TableCell>
                      <MetricCell
                        icon={ShieldIcon}
                        color="var(--primary)"
                        value={stats.pendingReview}
                        label="observaciones"
                      />
                    </TableCell>
                    <TableCell>
                      {importRecord.errorMessage ? (
                        <MetricCell
                          icon={CircleAlertIcon}
                          color="var(--color-critical)"
                          value="1"
                          label={
                            importRecord.errorMessage.length > 30
                              ? `${importRecord.errorMessage.slice(0, 30)}…`
                              : importRecord.errorMessage
                          }
                        />
                      ) : (
                        <MetricCell icon={CheckCircle2Icon} color="var(--color-good)" value="—" label="sin errores" />
                      )}
                    </TableCell>
                    <TableCell>
                      <MetricCell icon={ClockIcon} color="var(--color-neutral)" value={formatDuration(durationMs)} />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/importaciones/${importRecord.id}`} />}
                        nativeButton={false}
                      >
                        Ver detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {imports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Todavía no se ha importado ningún PDF.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Alert variant="info">
        <InfoIcon />
        <AlertDescription>
          El PDF se procesa al momento de subirlo — no cierres ni recargues esta pestaña hasta que la
          importación termine.
        </AlertDescription>
      </Alert>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} importaciones
          </p>
          <Pagination page={page} totalPages={totalPages} />
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
  value: string;
  icon: LucideIcon;
  color: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
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

function MetricCell({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: LucideIcon;
  color: string;
  value: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium tabular-nums">{value}</p>
        {label && <p className="max-w-32 truncate text-xs text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
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

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <PageButton disabled={page <= 1} href={`/importaciones?page=${page - 1}`}>
        «
      </PageButton>
      {pageWindow(page, totalPages).map((entry, index) =>
        entry === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1.5 text-muted-foreground">
            …
          </span>
        ) : (
          <PageButton key={entry} href={`/importaciones?page=${entry}`} active={entry === page}>
            {entry}
          </PageButton>
        )
      )}
      <PageButton disabled={page >= totalPages} href={`/importaciones?page=${page + 1}`}>
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
