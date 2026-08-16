import Link from "next/link";
import { ArchiveIcon, CheckCircle2Icon, Trash2Icon, UserIcon, WrenchIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIPO_ACTIVO_CODE_ORDER } from "@/lib/activos/labels";
import type { Region } from "@/lib/generated/prisma/client";
import { ActivosTable } from "./activos/activos-table";
import { CategoryBarChart, type CategoryBarDatum } from "./category-bar-chart";
import { DonutChart, type DonutDatum } from "./donut-chart";
import { MovimientosFeed } from "./movimientos-feed";

// Sin esto, Next.js prerenderiza esta página como estática en build time
// (no usa searchParams ni otra API dinámica) y los números quedan congelados
// con los datos que hubiera en la base durante el build.
export const dynamic = "force-dynamic";

const RECENT_MOVEMENTS_TAKE = 4;
const RECENT_ACTIVOS_TAKE = 6;

// Fase 14: el dashboard pasa a medir el estado patrimonial del Activo
// (Disponible/Asignado/Mantenimiento/Baja) en vez del estado de revisión de
// importación (ImportItemStatus) — Activos es el módulo central del
// sistema, no el pipeline de PDFs. Colores de estado fijos (skill dataviz),
// asignados directo en cada StatCard más abajo.
const REGION_LABELS: Record<Region, string> = {
  COSTA: "Costa",
  SIERRA: "Sierra",
  SELVA: "Selva",
};
const REGION_ORDER: Region[] = ["COSTA", "SIERRA", "SELVA"];

export default async function DashboardPage() {
  const [
    tiposActivo,
    activoCountsByTipo,
    activoCountsByEstado,
    totalActivos,
    sedesConConteo,
    movimientosRecientes,
    activosRecientes,
  ] = await Promise.all([
    prisma.tipoActivo.findMany(),
    prisma.activo.groupBy({ by: ["tipoActivoId"], _count: true }),
    prisma.activo.groupBy({ by: ["estadoPatrimonial"], _count: true }),
    prisma.activo.count(),
    prisma.sede.findMany({ select: { region: true, _count: { select: { activos: true } } } }),
    prisma.movimiento.findMany({
      orderBy: { fecha: "desc" },
      take: RECENT_MOVEMENTS_TAKE,
      include: {
        activo: { select: { id: true, nombreActivo: true } },
        responsableAnterior: true,
        responsableNuevo: true,
        sedeAnterior: true,
        sedeNueva: true,
        unidadOperativaAnterior: true,
        unidadOperativaNueva: true,
        ambienteAnterior: true,
        ambienteNuevo: true,
      },
    }),
    prisma.activo.findMany({
      orderBy: { updatedAt: "desc" },
      take: RECENT_ACTIVOS_TAKE,
      include: {
        tipoActivo: true,
        sede: true,
        unidadOperativa: true,
        subcategoria: true,
        responsableActual: true,
      },
    }),
  ]);

  const countByTipoActivoId = new Map(activoCountsByTipo.map((row) => [row.tipoActivoId, row._count]));
  const tipoActivoByCode = new Map(tiposActivo.map((tipo) => [tipo.code, tipo]));

  const tipoData: DonutDatum[] = TIPO_ACTIVO_CODE_ORDER.map((code, index) => {
    const tipo = tipoActivoByCode.get(code);
    return {
      key: code,
      label: tipo?.name ?? code,
      value: tipo ? (countByTipoActivoId.get(tipo.id) ?? 0) : 0,
      color: `var(--color-chart-${index + 1})`,
    };
  });

  const countByEstado = new Map(activoCountsByEstado.map((row) => [row.estadoPatrimonial, row._count]));
  const disponible = countByEstado.get("DISPONIBLE") ?? 0;
  const asignado = countByEstado.get("ASIGNADO") ?? 0;
  const mantenimiento = countByEstado.get("MANTENIMIENTO") ?? 0;
  const baja = countByEstado.get("BAJA") ?? 0;

  const countByRegion = new Map<Region, number>();
  for (const sede of sedesConConteo) {
    countByRegion.set(sede.region, (countByRegion.get(sede.region) ?? 0) + sede._count.activos);
  }
  const regionData: CategoryBarDatum[] = REGION_ORDER.map((region) => ({
    name: REGION_LABELS[region],
    count: countByRegion.get(region) ?? 0,
  }));

  const porcentaje = (value: number) => (totalActivos > 0 ? `${Math.round((value / totalActivos) * 100)}% del total` : "Sin datos");

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen general del patrimonio institucional.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total de activos"
          value={totalActivos}
          icon={ArchiveIcon}
          color="var(--primary)"
          hint="100% del patrimonio"
        />
        <StatCard
          label="Disponibles"
          value={disponible}
          icon={CheckCircle2Icon}
          color="var(--color-good)"
          hint={porcentaje(disponible)}
        />
        <StatCard label="Asignados" value={asignado} icon={UserIcon} color="var(--primary)" hint={porcentaje(asignado)} />
        <StatCard
          label="En mantenimiento"
          value={mantenimiento}
          icon={WrenchIcon}
          color="var(--color-warning)"
          hint={porcentaje(mantenimiento)}
        />
        <StatCard
          label="Dados de baja"
          value={baja}
          icon={Trash2Icon}
          color="var(--color-critical)"
          hint={porcentaje(baja)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Activos por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <DonutChart
              data={tipoData}
              total={totalActivos}
              centerLabel={totalActivos === 1 ? "activo" : "activos"}
            />
            <ul className="space-y-2">
              {tipoData.map((datum) => (
                <li key={datum.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: datum.color }} />
                    <span className="truncate">{datum.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {datum.value.toLocaleString("es-PE")}
                    {totalActivos > 0 && ` (${Math.round((datum.value / totalActivos) * 100)}%)`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Activos por región</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={regionData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Últimos movimientos</CardTitle>
            <Link href="/movimientos" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            <MovimientosFeed movimientos={movimientosRecientes} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Activos recientes</CardTitle>
          <Link href="/activos" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <ActivosTable activos={activosRecientes} emptyMessage="Sin activos todavía." />
        </CardContent>
      </Card>
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
