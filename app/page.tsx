import { ArchiveIcon, CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import type { ImportItemStatus } from "@/lib/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IMPORT_ITEM_STATUS_LABELS } from "@/lib/import-workflow/labels";
import { CategoryBarChart, type CategoryBarDatum } from "./category-bar-chart";
import { StatusDonutChart, type StatusDatum } from "./status-donut-chart";

// Sin esto, Next.js prerenderiza esta página como estática en build time
// (no usa searchParams ni otra API dinámica) y los números quedan congelados
// con los datos que hubiera en la base durante el build.
export const dynamic = "force-dynamic";

// Orden canónico de las 6 categorías patrimoniales (ver ARCHITECTURE.md 5.2).
const CATEGORY_ORDER = [
  "EQUIPOS_INFORMATICOS",
  "EQUIPOS_DE_OFICINA",
  "MUEBLES_DE_OFICINA",
  "BIENES_VEHICULARES",
  "EQUIPOS_DE_MAQUINARIA",
  "BIENES_INMUEBLES",
] as const;

// Colores de estado fijos (skill dataviz: good/warning/critical/neutral —
// nunca se tematizan, mismos valores en claro y oscuro).
const STATUS_META: Record<string, { color: string; order: number }> = {
  CONFIRMED: { color: "var(--color-good)", order: 0 },
  REVIEW_REQUIRED: { color: "var(--color-warning)", order: 1 },
  REJECTED: { color: "var(--color-critical)", order: 2 },
  IGNORED: { color: "var(--color-neutral)", order: 3 },
};

export default async function DashboardPage() {
  const [categories, productCounts, itemStatusCounts, totalProducts] = await Promise.all([
    prisma.category.findMany(),
    prisma.product.groupBy({ by: ["categoryId"], _count: true }),
    prisma.importItem.groupBy({ by: ["status"], _count: true }),
    prisma.product.count(),
  ]);

  const countByCategoryId = new Map(productCounts.map((row) => [row.categoryId, row._count]));
  const categoryByCode = new Map(categories.map((category) => [category.code, category]));

  const barData: CategoryBarDatum[] = CATEGORY_ORDER.map((code) => {
    const category = categoryByCode.get(code);
    return {
      name: category?.name ?? code,
      count: category ? (countByCategoryId.get(category.id) ?? 0) : 0,
    };
  });

  const countByStatus = new Map(itemStatusCounts.map((row) => [row.status, row._count]));
  const totalItems = itemStatusCounts.reduce((sum, row) => sum + row._count, 0);

  const statusData: StatusDatum[] = Object.entries(STATUS_META)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([status, meta]) => ({
      key: status,
      label: IMPORT_ITEM_STATUS_LABELS[status] ?? status,
      value: countByStatus.get(status as ImportItemStatus) ?? 0,
      color: meta.color,
    }));

  const confirmed = countByStatus.get("CONFIRMED") ?? 0;
  const pendingReview = countByStatus.get("REVIEW_REQUIRED") ?? 0;
  const rejected = countByStatus.get("REJECTED") ?? 0;

  return (
    <main className="space-y-6 p-6">
      <h1 className="text-xl font-medium">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de productos"
          value={totalProducts}
          icon={ArchiveIcon}
          accent="chart-1"
          hint={`${categories.length} categorías patrimoniales`}
        />
        <StatCard
          label="Confirmados"
          value={confirmed}
          icon={CheckCircle2Icon}
          accent="good"
          hint={totalItems > 0 ? `${Math.round((confirmed / totalItems) * 100)}% del total` : "Sin datos"}
        />
        <StatCard
          label="Pendientes de revisión"
          value={pendingReview}
          icon={ClockIcon}
          accent="warning"
          hint={pendingReview > 0 ? "Acción requerida" : "Todo al día"}
        />
        <StatCard
          label="Rechazados"
          value={rejected}
          icon={XCircleIcon}
          accent="critical"
          hint={totalItems > 0 ? `${Math.round((rejected / totalItems) * 100)}% del total` : "Sin datos"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Distribución de productos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={barData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Ítems por estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <StatusDonutChart
              data={statusData}
              total={totalItems}
              centerLabel={totalItems === 1 ? "ítem" : "ítems"}
            />
            <ul className="space-y-2">
              {statusData.map((datum) => (
                <li key={datum.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: datum.color }}
                    />
                    {datum.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {datum.value.toLocaleString("es-PE")}
                    {totalItems > 0 && ` · ${Math.round((datum.value / totalItems) * 100)}%`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "chart-1" | "good" | "warning" | "critical";
  hint: string;
}) {
  return (
    <Card
      className="border-l-4"
      style={{ borderLeftColor: `var(--color-${accent})` }}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `color-mix(in oklch, var(--color-${accent}) 15%, transparent)`,
              color: `var(--color-${accent})`,
            }}
          >
            <Icon className="size-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {value.toLocaleString("es-PE")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
