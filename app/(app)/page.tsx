import Link from "next/link";
import {
  ArchiveIcon,
  CheckCircle2Icon,
  PencilIcon,
  FileTextIcon,
  Trash2Icon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ESTADO_PATRIMONIAL_LABELS, TIPO_ACTIVO_CODE_ORDER } from "@/lib/activos/labels";
import type { Region } from "@/lib/generated/prisma/client";
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
      include: { tipoActivo: true, sede: true, responsableActual: true },
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
          accent="chart-1"
          hint="100% del patrimonio"
        />
        <StatCard
          label="Disponibles"
          value={disponible}
          icon={CheckCircle2Icon}
          accent="good"
          hint={porcentaje(disponible)}
        />
        <StatCard label="Asignados" value={asignado} icon={UserIcon} accent="chart-1" hint={porcentaje(asignado)} />
        <StatCard
          label="En mantenimiento"
          value={mantenimiento}
          icon={WrenchIcon}
          accent="warning"
          hint={porcentaje(mantenimiento)}
        />
        <StatCard label="Dados de baja" value={baja} icon={Trash2Icon} accent="critical" hint={porcentaje(baja)} />
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
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo de activo</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activosRecientes.map((activo) => (
                <TableRow key={activo.id}>
                  <TableCell className="text-sm text-muted-foreground">{activo.codigoPatrimonial ?? "—"}</TableCell>
                  <TableCell>
                    <Link href={`/activos/${activo.id}`} className="hover:underline">
                      {activo.nombreActivo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{activo.tipoActivo.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{activo.sede?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {activo.responsableActual?.nombre ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        render={<Link href={`/activos/${activo.id}`} aria-label="Ver o editar" />}
                        nativeButton={false}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        render={<Link href={`/activos/${activo.id}/ficha`} aria-label="Ficha técnica" />}
                        nativeButton={false}
                      >
                        <FileTextIcon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {activosRecientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Sin activos todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
