import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default async function DashboardPage() {
  const [totalProducts, totalImports, pendingImports, pendingReviewItems, categories, productCounts] =
    await Promise.all([
      prisma.product.count(),
      prisma.import.count(),
      prisma.import.count({
        where: { status: { in: ["UPLOADED", "PROCESSING", "READY_FOR_REVIEW"] } },
      }),
      prisma.importItem.count({ where: { status: "REVIEW_REQUIRED" } }),
      prisma.category.findMany(),
      prisma.product.groupBy({ by: ["categoryId"], _count: true }),
    ]);

  const countByCategoryId = new Map(productCounts.map((row) => [row.categoryId, row._count]));
  const categoryByCode = new Map(categories.map((category) => [category.code, category]));

  const distribution = CATEGORY_ORDER.map((code) => {
    const category = categoryByCode.get(code);
    return {
      code,
      name: category?.name ?? code,
      count: category ? (countByCategoryId.get(category.id) ?? 0) : 0,
    };
  });

  const maxCount = Math.max(1, ...distribution.map((row) => row.count));

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <h1 className="text-xl font-medium">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total productos" value={totalProducts} />
        <StatTile label="Total importaciones" value={totalImports} />
        <StatTile label="Importaciones pendientes" value={pendingImports} />
        <StatTile label="Productos pendientes de revisión" value={pendingReviewItems} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Distribución por categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 border-l border-border pl-4">
            {distribution.map((row) => (
              <div key={row.code} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-sm text-muted-foreground">{row.name}</span>
                <div className="flex flex-1 items-center gap-2">
                  <div
                    className="h-4 rounded-r-[4px] bg-chart-1"
                    style={{
                      width: `${(row.count / maxCount) * 100}%`,
                      minWidth: row.count > 0 ? "4px" : 0,
                    }}
                  />
                  <span className="text-sm tabular-nums text-foreground">{row.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-2xl">{value.toLocaleString("es-PE")}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{label}</CardContent>
    </Card>
  );
}
