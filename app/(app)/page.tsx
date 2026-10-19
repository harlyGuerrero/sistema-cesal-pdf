import Link from "next/link";
import { ArchiveIcon, CheckCircle2Icon, Trash2Icon, UserIcon, WrenchIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TIPO_ACTIVO_CODE_ORDER } from "@/lib/activos/labels";
import { ActivosTable } from "./activos/activos-table";
import { SedeBarChart, type SedeBarDatum } from "./sede-bar-chart";
import { TipoActivoPieCard, type TipoActivoPieDatum } from "./tipo-activo-pie-card";
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
    prisma.sede.findMany({ select: { name: true, _count: { select: { activos: true } } } }),
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

  const tipoData: TipoActivoPieDatum[] = TIPO_ACTIVO_CODE_ORDER.map((code, index) => {
    const tipo = tipoActivoByCode.get(code);
    return {
      key: code,
      label: tipo?.name ?? code,
      value: tipo ? (countByTipoActivoId.get(tipo.id) ?? 0) : 0,
      color: `var(--chart-${index + 1})`,
    };
  });

  const countByEstado = new Map(activoCountsByEstado.map((row) => [row.estadoPatrimonial, row._count]));
  const disponible = countByEstado.get("DISPONIBLE") ?? 0;
  const asignado = countByEstado.get("ASIGNADO") ?? 0;
  const mantenimiento = countByEstado.get("MANTENIMIENTO") ?? 0;
  const baja = countByEstado.get("BAJA") ?? 0;

  // Orden descendente: la sede con más activos queda primera y es la barra
  // destacada del gráfico (índice 0).
  const sedeData: SedeBarDatum[] = sedesConConteo
    .map((sede) => ({ sede: sede.name, activos: sede._count.activos }))
    .sort((a, b) => b.activos - a.activos || a.sede.localeCompare(b.sede, "es"));
  const sedeTop = sedeData[0];
  // Solo una parte del inventario tiene sede asignada: el gráfico tiene que
  // decirlo, o las barras sugieren que las sedes tienen muy pocos bienes.
  const activosConSede = sedeData.reduce((suma, sede) => suma + sede.activos, 0);
  const activosSinSede = totalActivos - activosConSede;

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
          color="var(--foreground)"
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
        <TipoActivoPieCard data={tipoData} total={totalActivos} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Activos por sede</CardTitle>
            <CardDescription>
              {activosConSede.toLocaleString("es-PE")} de {totalActivos.toLocaleString("es-PE")} activos con sede
              asignada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SedeBarChart data={sedeData} activeIndex={0} />
          </CardContent>
          {totalActivos > 0 && (
            <CardFooter className="mt-auto flex-col items-start gap-1 text-sm">
              {sedeTop && sedeTop.activos > 0 && (
                <p className="font-medium">
                  {sedeTop.sede} concentra {sedeTop.activos.toLocaleString("es-PE")}{" "}
                  {sedeTop.activos === 1 ? "activo" : "activos"} (
                  {Math.round((sedeTop.activos / totalActivos) * 100)}% del total)
                </p>
              )}
              {activosSinSede > 0 && (
                <Link href="/activos" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  {activosSinSede.toLocaleString("es-PE")} {activosSinSede === 1 ? "activo" : "activos"} sin sede
                  asignada
                </Link>
              )}
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Últimos movimientos</CardTitle>
            <CardAction>
              <Link href="/movimientos" className="text-sm text-primary underline-offset-4 hover:underline">
                Ver todos
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <MovimientosFeed movimientos={movimientosRecientes} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Activos recientes</CardTitle>
          <CardAction>
            <Link href="/activos" className="text-sm text-primary underline-offset-4 hover:underline">
              Ver todos
            </Link>
          </CardAction>
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
