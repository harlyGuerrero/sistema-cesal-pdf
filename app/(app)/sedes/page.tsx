import Link from "next/link";
import { Suspense } from "react";
import { ArrowRightIcon, Building2Icon, PlusIcon, UsersIcon } from "lucide-react";
import { prisma } from "@/lib/db";
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
import { REGION_LABELS, REGION_META, REGION_OPTIONS } from "@/lib/sedes/labels";
import type { Prisma, Region } from "@/lib/generated/prisma/client";
import { SedesToolbar } from "./sedes-toolbar";
import { SedeRowActions } from "./sede-row-actions";

// Fase 31: rediseño visual de /sedes — mismo lenguaje de stat cards +
// buscador que /activos, /usuarios y /responsables, pero conserva la
// agrupación por región que ya existía (Fase B) en vez de aplanarla a una
// tabla — acá la jerarquía real es Zona -> Sede, así que la vista por
// defecto la respeta; "Vista de lista" (nueva) es la versión aplanada para
// cuando lo que importa es comparar sedes entre zonas. Un solo color fijo
// por región (REGION_META) reusado en todos lados: ícono de zona, badge de
// conteo, ícono de cada sede dentro de la zona, y el link "Ver detalles de
// zona" — nunca un color inventado por pantalla.
export default async function SedesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string; region?: string }>;
}) {
  const { q, view: viewParam, region: regionParam } = await searchParams;
  const view = viewParam === "lista" ? "lista" : "zonas";

  const where: Prisma.SedeWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(view === "lista" && regionParam && regionParam !== "all" ? { region: regionParam as Region } : {}),
  };

  const [sedes, totalSedes, sedesConUnidades, unidadesOperativasTotal] = await Promise.all([
    prisma.sede.findMany({
      where,
      include: { _count: { select: { unidadesOperativas: true } } },
      orderBy: [{ region: "asc" }, { name: "asc" }],
    }),
    prisma.sede.count(),
    prisma.sede.count({ where: { unidadesOperativas: { some: {} } } }),
    prisma.unidadOperativa.count(),
  ]);

  const sedesByRegion = new Map<string, typeof sedes>();
  for (const option of REGION_OPTIONS) sedesByRegion.set(option.value, []);
  for (const sede of sedes) {
    sedesByRegion.get(sede.region)?.push(sede);
  }

  const porcentaje = (value: number) => (totalSedes > 0 ? `${Math.round((value / totalSedes) * 100)}% del total` : "Sin datos");

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Sedes</h1>
          <p className="text-sm text-muted-foreground">Organización de las sedes por zona geográfica.</p>
        </div>
        <Button render={<Link href="/sedes/nueva" />} nativeButton={false}>
          <PlusIcon />
          Nueva sede
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de zonas"
          value={REGION_OPTIONS.length}
          icon={Building2Icon}
          color="var(--primary)"
          hint="zonas registradas"
        />
        <StatCard
          label="Total de sedes"
          value={totalSedes}
          icon={Building2Icon}
          color="var(--color-good)"
          hint="sedes registradas"
        />
        <StatCard
          label="Sedes con unidades"
          value={sedesConUnidades}
          icon={Building2Icon}
          color="var(--color-chart-5)"
          hint={porcentaje(sedesConUnidades)}
        />
        <StatCard
          label="Unidades operativas"
          value={unidadesOperativasTotal}
          icon={UsersIcon}
          color="var(--color-warning)"
          hint="en total"
        />
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            <SedesToolbar view={view} />
          </Suspense>
        </CardContent>
      </Card>

      {view === "lista" ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <p className="text-sm font-medium">Sedes encontradas ({sedes.length.toLocaleString("es-PE")})</p>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Sede</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Unidades operativas</TableHead>
                  <TableHead className="pr-6 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sedes.map((sede) => {
                  const { icon: RegionIcon, color } = REGION_META[sede.region];
                  return (
                    <TableRow key={sede.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
                          >
                            <Building2Icon className="size-4" />
                          </span>
                          <Link href={`/sedes/${sede.id}`} className="truncate text-sm hover:underline">
                            {sede.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
                        >
                          <RegionIcon className="size-3" />
                          {REGION_LABELS[sede.region]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sede._count.unidadesOperativas > 0
                          ? `${sede._count.unidadesOperativas} unidad${sede._count.unidadesOperativas === 1 ? "" : "es"}`
                          : "Sin unidades"}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <SedeRowActions sedeId={sede.id} nombre={sede.name} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sedes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay sedes que coincidan con el filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {REGION_OPTIONS.map((option) => {
            const regionSedes = sedesByRegion.get(option.value) ?? [];
            const { icon: RegionIcon, color } = REGION_META[option.value];

            return (
              <Card key={option.value} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
                      >
                        <RegionIcon className="size-4" />
                      </span>
                      <div>
                        <p className="text-base font-semibold">{option.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {regionSedes.length} sede{regionSedes.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
                    >
                      {regionSedes.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-1">
                  {regionSedes.map((sede) => (
                    <div
                      key={sede.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                    >
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`, color }}
                      >
                        <Building2Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/sedes/${sede.id}`} className="block truncate text-sm hover:underline">
                          {sede.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {sede._count.unidadesOperativas > 0
                            ? `${sede._count.unidadesOperativas} unidad${sede._count.unidadesOperativas === 1 ? "" : "es"} operativa${sede._count.unidadesOperativas === 1 ? "" : "s"}`
                            : "Sin unidades operativas"}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`, color }}
                      >
                        {sede._count.unidadesOperativas > 0 ? `${sede._count.unidadesOperativas} unidades` : "Sin unidades"}
                      </span>
                      <SedeRowActions sedeId={sede.id} nombre={sede.name} />
                    </div>
                  ))}
                  {regionSedes.length === 0 && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">
                      Sin sedes en {REGION_LABELS[option.value]}.
                    </p>
                  )}
                </CardContent>
                <div className="border-t px-4 pt-4">
                  <Link
                    href={`/sedes?view=lista&region=${option.value}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                    style={{ color }}
                  >
                    Ver detalles de zona
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
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
