import { notFound } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IMPORT_STATUS_LABELS, IMPORT_STATUS_VARIANT } from "@/lib/import-workflow/labels";
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
    category: item.tipoActivo ? { id: item.tipoActivo.id, name: item.tipoActivo.name } : null,
    categoryConfidence: item.categoryConfidence,
    relevanceConfidence: item.relevanceConfidence,
  }));

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium">{importRecord.fileName}</h1>
          <Badge variant={IMPORT_STATUS_VARIANT[importRecord.status] ?? "outline"}>
            {IMPORT_STATUS_LABELS[importRecord.status] ?? importRecord.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Subido el {importRecord.createdAt.toLocaleString("es-PE")}
        </p>
      </div>

      {importRecord.errorMessage && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>El procesamiento falló</AlertTitle>
          <AlertDescription>{importRecord.errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard label="Candidatos" value={counts.total} />
        <SummaryCard label="Productos" value={counts.products} />
        <SummaryCard label="Consumibles / otros" value={counts.consumables} />
        <SummaryCard label="Rechazados" value={counts.rejected} />
        <SummaryCard label="Pendientes de revisión" value={counts.pendingReview} />
      </div>

      <ReviewTable items={serializedItems} categories={categories} />
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{label}</CardContent>
    </Card>
  );
}
