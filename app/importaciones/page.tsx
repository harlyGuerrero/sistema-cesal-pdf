import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IMPORT_STATUS_LABELS, IMPORT_STATUS_VARIANT } from "@/lib/import-workflow/labels";

const PAGE_SIZE = 20;

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [imports, total] = await Promise.all([
    prisma.import.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.import.count(),
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

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Importaciones</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Archivo</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Revisión</TableHead>
            <TableHead>Errores</TableHead>
            <TableHead>Duración</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {imports.map((importRecord) => {
            const stats = statsByImport.get(importRecord.id) ?? { products: 0, pendingReview: 0 };
            const durationMs = importRecord.processedAt
              ? importRecord.processedAt.getTime() - importRecord.createdAt.getTime()
              : null;

            return (
              <TableRow key={importRecord.id}>
                <TableCell className="max-w-56 truncate" title={importRecord.fileName}>
                  {importRecord.fileName}
                </TableCell>
                <TableCell>{importRecord.createdAt.toLocaleString("es-PE")}</TableCell>
                <TableCell>
                  <Badge variant={IMPORT_STATUS_VARIANT[importRecord.status] ?? "outline"}>
                    {IMPORT_STATUS_LABELS[importRecord.status] ?? importRecord.status}
                  </Badge>
                </TableCell>
                <TableCell>{stats.products}</TableCell>
                <TableCell>
                  {stats.pendingReview > 0 ? (
                    <Badge variant="secondary">{stats.pendingReview}</Badge>
                  ) : (
                    "0"
                  )}
                </TableCell>
                <TableCell>
                  {importRecord.errorMessage ? (
                    <span className="text-destructive" title={importRecord.errorMessage}>
                      {importRecord.errorMessage.length > 40
                        ? `${importRecord.errorMessage.slice(0, 40)}…`
                        : importRecord.errorMessage}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{formatDuration(durationMs)}</TableCell>
                <TableCell>
                  <Link href={`/importaciones/${importRecord.id}`} className="hover:underline">
                    Ver detalle
                  </Link>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <PageLink page={page - 1} disabled={page <= 1}>
            Anterior
          </PageLink>
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages}>
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
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-muted-foreground">{children}</span>;
  }
  return (
    <Link href={`/importaciones?page=${page}`} className="hover:underline">
      {children}
    </Link>
  );
}
