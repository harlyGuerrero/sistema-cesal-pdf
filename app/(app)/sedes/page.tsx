import Link from "next/link";
import { Building2Icon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REGION_LABELS, REGION_OPTIONS } from "@/lib/sedes/labels";

export default async function SedesPage() {
  const sedes = await prisma.sede.findMany({
    include: { _count: { select: { unidadesOperativas: true } } },
    orderBy: [{ region: "asc" }, { name: "asc" }],
  });

  const sedesByRegion = new Map<string, typeof sedes>();
  for (const option of REGION_OPTIONS) sedesByRegion.set(option.value, []);
  for (const sede of sedes) {
    sedesByRegion.get(sede.region)?.push(sede);
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Sedes</h1>
        <Button render={<Link href="/sedes/nueva" />} nativeButton={false}>
          Nueva sede
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {REGION_OPTIONS.map((option) => {
          const regionSedes = sedesByRegion.get(option.value) ?? [];
          return (
            <Card key={option.value}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base font-semibold">
                  {option.label}
                  <span className="text-sm font-normal text-muted-foreground">
                    {regionSedes.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {regionSedes.map((sede) => (
                  <Link
                    key={sede.id}
                    href={`/sedes/${sede.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{sede.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {sede._count.unidadesOperativas > 0
                        ? `${sede._count.unidadesOperativas} unidad${sede._count.unidadesOperativas === 1 ? "" : "es"}`
                        : "Sin unidades"}
                    </span>
                  </Link>
                ))}
                {regionSedes.length === 0 && (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">
                    Sin sedes en {REGION_LABELS[option.value]}.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
