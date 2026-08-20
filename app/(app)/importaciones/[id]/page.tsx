import { notFound } from "next/navigation";
import {
  ArchiveIcon,
  CalendarIcon,
  CircleAlertIcon,
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  PackageIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { IMPORT_STATUS_LABELS, IMPORT_STATUS_META } from "@/lib/import-workflow/labels";
import { NumeroFacturaEditor } from "./numero-factura-editor";
import { ReviewTable, type ReviewItem } from "./review-table";

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const importRecord = await prisma.import.findUnique({
    where: { id },
    include: {
      items: {
        include: { tipoActivo: true },
        orderBy: [{ sourcePage: "asc" }, { sourceTable: "asc" }, { sourceRow: "asc" }],
      },
    },
  });

  if (!importRecord) {
    notFound();
  }

  const categories = await prisma.tipoActivo.findMany({ orderBy: { name: "asc" } });

  const items = importRecord.items;
  const counts = {
    total: items.length,
    products: items.filter((item) => item.relevance === "PRODUCT").length,
    consumables: items.filter(
      (item) =>
        item.relevance === "CONSUMABLE" || item.relevance === "SERVICE" || item.relevance === "OTHER"
    ).length,
    rejected: items.filter((item) => item.status === "REJECTED").length,
    pendingReview: items.filter((item) => item.status === "REVIEW_REQUIRED").length,
  };

  // Prisma Decimal/Date no son serializables a un Client Component tal cual.
  const serializedItems: ReviewItem[] = items.map((item) => ({
    id: item.id,
    rawText: item.rawText,
    normalizedName: item.normalizedName,
    quantity: item.quantity !== null ? Number(item.quantity) : null,
    unitPrice: item.unitPrice !== null ? Number(item.unitPrice) : null,
    totalPrice: item.totalPrice !== null ? Number(item.totalPrice) : null,
    relevance: item.relevance,
    status: item.status,
    categoryId: item.tipoActivoId,
    category: item.tipoActivo ? { id: item.tipoActivo.id, name: item.tipoActivo.name, code: item.tipoActivo.code } : null,
    categoryConfidence: item.categoryConfidence,
    relevanceConfidence: item.relevanceConfidence,
    extractionConfidence: item.extractionConfidence,
  }));

  const statusMeta = IMPORT_STATUS_META[importRecord.status] ?? IMPORT_STATUS_META.UPLOADED;
  const StatusIcon = statusMeta.icon;

  return (
    <>
      <PageBreadcrumb items={[{ label: importRecord.fileName }]} />
      <main className="space-y-6 p-6">
      <Card>
        <CardContent className="flex items-center gap-4">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "color-mix(in oklch, var(--color-critical) 12%, transparent)",
              color: "var(--color-critical)",
            }}
          >
            <FileTextIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold" title={importRecord.fileName}>
                {importRecord.fileName}
              </h1>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `color-mix(in oklch, ${statusMeta.color} 15%, transparent)`,
                  color: statusMeta.color,
                }}
              >
                <StatusIcon className="size-3" />
                {IMPORT_STATUS_LABELS[importRecord.status] ?? importRecord.status}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarIcon className="size-3.5" />
              Subido el {importRecord.createdAt.toLocaleString("es-PE")}
            </div>
            <NumeroFacturaEditor importId={importRecord.id} numeroFactura={importRecord.numeroFactura} />
          </div>
        </CardContent>
      </Card>

      {importRecord.errorMessage && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>El procesamiento falló</AlertTitle>
          <AlertDescription>{importRecord.errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Candidatos" value={counts.total} icon={ClipboardListIcon} color="var(--primary)" />
        <StatCard label="Productos" value={counts.products} icon={PackageIcon} color="var(--color-good)" />
        <StatCard
          label="Consumibles / otros"
          value={counts.consumables}
          icon={ArchiveIcon}
          color="var(--color-warning)"
        />
        <StatCard label="Rechazados" value={counts.rejected} icon={XCircleIcon} color="var(--color-critical)" />
        <StatCard
          label="Pendientes de revisión"
          value={counts.pendingReview}
          icon={ClockIcon}
          color="var(--color-neutral)"
        />
      </div>

      <ReviewTable items={serializedItems} categories={categories} />

      <Alert variant="info">
        <ClipboardListIcon />
        <AlertTitle>Información</AlertTitle>
        <AlertDescription>
          Revisa los productos detectados y confirma los que correspondan. Los productos rechazados o
          ignorados no se importarán al sistema.
        </AlertDescription>
      </Alert>
      </main>
    </>
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
  icon: LucideIcon;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
        >
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
