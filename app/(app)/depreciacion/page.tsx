import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  CoinsIcon,
  LandmarkIcon,
  PackageIcon,
  TrendingDownIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TIPO_ACTIVO_META } from "@/lib/activos/tipo-activo-meta";
import { formatFecha, formatPeriodo, formatPorcentaje, formatSoles, periodoActual } from "@/lib/depreciacion/calculo";
import { cargarSituacionDepreciacion, type ColumnaOrdenable, type FiltrosDepreciacion } from "@/lib/depreciacion/listado";
import { formatTasa, parseTasa, tasaTrimestralDesdeAnual } from "@/lib/depreciacion/tasas";
import { DepreciacionFilters } from "./depreciacion-filters";
import { EstadoDepreciacionBadge } from "./estado-depreciacion-badge";
import { ProcesarTrimestreDialog } from "./procesar-trimestre-dialog";

const PAGE_SIZE = 20;

// Fase 58: módulo general de depreciación. Todo lo que muestra sale de los
// datos reales (Activo + TasaDepreciacion + DepreciacionPeriodo) calculado
// en el servidor con el mismo motor que el detalle de cada activo (ver
// lib/depreciacion/calculo.ts). Abrir la página nunca procesa nada: eso es
// solo el botón "Procesar trimestre".
export default async function DepreciacionPage({
  searchParams,
}: {
  searchParams: Promise<FiltrosDepreciacion & { page?: string }>;
}) {
  const { page: pageParam, ...filtros } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const actual = periodoActual();

  const [{ filas, totales, corte }, tiposActivo, primeraCompra, ultimoProcesamiento] = await Promise.all([
    cargarSituacionDepreciacion(prisma, filtros),
    prisma.tipoActivo.findMany({ orderBy: { name: "asc" }, include: { tasaDepreciacion: true } }),
    prisma.activo.aggregate({ _min: { fechaAdquisicion: true } }),
    prisma.procesamientoDepreciacion.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  const primerAnio = Math.min(primeraCompra._min.fechaAdquisicion?.getUTCFullYear() ?? actual.anio, actual.anio);
  const anios = Array.from({ length: actual.anio - primerAnio + 1 }, (_, i) => actual.anio - i);

  const total = filas.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pagina = filas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const mensajeVacio =
    totales.activos === 0 && !hayFiltros(filtros)
      ? "Todavía no hay activos registrados."
      : "No hay activos que coincidan con el filtro.";

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-medium">Depreciación</h1>
          <p className="text-sm text-muted-foreground">
            Depreciación lineal trimestral sobre el costo de adquisición, según las tasas oficiales de CESAL.
            {ultimoProcesamiento &&
              ` Último procesamiento: ${formatPeriodo(ultimoProcesamiento)}, el ${ultimoProcesamiento.createdAt.toLocaleDateString("es-PE", { timeZone: "America/Lima" })}.`}
          </p>
        </div>
        <ProcesarTrimestreDialog anios={anios} periodoActual={actual} />
      </div>

      {corte && (
        <p className="rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
          Mostrando la situación al cierre del <span className="font-medium">{formatPeriodo(corte)}</span>: solo cuentan los
          trimestres registrados hasta ese periodo y los activos adquiridos hasta entonces.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Activos depreciables"
          value={totales.depreciables.toLocaleString("es-PE")}
          icon={PackageIcon}
          color="var(--primary)"
          hint={`de ${totales.activos.toLocaleString("es-PE")} activos`}
        />
        <StatCard
          label="Costo original"
          value={formatSoles(totales.costoCentavos)}
          icon={CoinsIcon}
          color="var(--color-chart-2)"
          hint="de los activos depreciables"
        />
        <StatCard
          label="Depreciación acumulada"
          value={formatSoles(totales.acumuladoCentavos)}
          icon={TrendingDownIcon}
          color="var(--color-chart-3)"
          hint={
            totales.costoCentavos > 0
              ? `${formatPorcentaje((totales.acumuladoCentavos / totales.costoCentavos) * 100, 1)} del costo`
              : "sin costo registrado"
          }
        />
        <StatCard
          label="Valor neto contable"
          value={formatSoles(totales.valorNetoCentavos)}
          icon={LandmarkIcon}
          color="var(--color-chart-4)"
          hint="costo − depreciación acumulada"
        />
        <StatCard
          label="Totalmente depreciados"
          value={totales.totalmenteDepreciados.toLocaleString("es-PE")}
          icon={CheckCircle2Icon}
          color="var(--color-good)"
          hint="valor neto S/ 0,00"
        />
        <StatCard
          label="Pendientes de revisión"
          value={totales.pendientesConfiguracionORevision.toLocaleString("es-PE")}
          icon={AlertTriangleIcon}
          color="var(--color-warning)"
          hint="sin costo, fecha o tasa válidos"
        />
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            {/* Solo id y nombre: el tipo trae su tasa como Decimal, que no
                puede pasar a un componente de cliente. */}
            <DepreciacionFilters tiposActivo={tiposActivo.map(({ id, name }) => ({ id, name }))} anios={anios} />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Activos encontrados ({total.toLocaleString("es-PE")})</p>
        </CardHeader>
        {/* Responsive: el tipo va bajo el nombre, la fecha bajo el costo y las
            dos tasas en una columna, para que la tabla entre sin barra
            horizontal en escritorio; en celular (< md) cada activo es una
            tarjeta. */}
        <CardContent className="overflow-x-auto px-0">
          <ul className="divide-y border-t md:hidden">
            {pagina.map((fila) => {
              const { icon: Icon, color } = TIPO_ACTIVO_META[fila.tipoActivoCode];
              return (
                <li key={fila.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/activos/${fila.id}#depreciacion`}
                        title={fila.nombreActivo}
                        className="line-clamp-2 text-sm break-words hover:underline"
                      >
                        {fila.nombreActivo}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="size-3.5 shrink-0" style={{ color }} />
                        <span className="truncate">
                          <span className="font-mono">{fila.codigoPatrimonial}</span> · {fila.tipoActivo}
                          {fila.dadoDeBaja && " · Dado de baja"}
                        </span>
                      </p>
                    </div>
                    <EstadoDepreciacionBadge estado={fila.resumen.estado} />
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Costo</dt>
                      <dd className="tabular-nums">{formatSoles(fila.resumen.costoCentavos)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Acumulada</dt>
                      <dd className="tabular-nums">{formatSoles(fila.resumen.acumuladoCentavos)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Valor neto</dt>
                      <dd className="font-medium tabular-nums">{formatSoles(fila.resumen.valorNetoCentavos)}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
            {pagina.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">{mensajeVacio}</li>
            )}
          </ul>

          <Table className="max-md:hidden">
            <TableHeader>
              <TableRow>
                <SortableHead columna="codigo" filtros={filtros} className="pl-6">
                  Código
                </SortableHead>
                <TableHead>
                  <SortLink columna="nombre" filtros={filtros}>
                    Activo
                  </SortLink>
                  <span className="mx-1 text-muted-foreground/60">/</span>
                  <SortLink columna="tipo" filtros={filtros}>
                    Tipo
                  </SortLink>
                </TableHead>
                <TableHead className="text-right">
                  <SortLink columna="costo" filtros={filtros}>
                    Costo
                  </SortLink>
                  <span className="mx-1 text-muted-foreground/60">/</span>
                  <SortLink columna="fecha" filtros={filtros}>
                    Fecha
                  </SortLink>
                </TableHead>
                <TableHead className="text-right">Tasa</TableHead>
                <SortableHead columna="acumulado" filtros={filtros} className="text-right">
                  Acumulada
                </SortableHead>
                <SortableHead columna="valorNeto" filtros={filtros} className="text-right">
                  Valor neto
                </SortableHead>
                <SortableHead columna="estado" filtros={filtros}>
                  Estado
                </SortableHead>
                <TableHead className="pr-6 text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagina.map((fila) => {
                const { icon: Icon, color } = TIPO_ACTIVO_META[fila.tipoActivoCode];
                return (
                  <TableRow key={fila.id}>
                    <TableCell className="pl-6 font-mono text-xs">{fila.codigoPatrimonial}</TableCell>
                    <TableCell>
                      <div className="max-w-[17rem] min-w-[12rem]">
                        <p className="line-clamp-2 text-sm break-words whitespace-normal" title={fila.nombreActivo}>
                          {fila.nombreActivo}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="size-3.5 shrink-0" style={{ color }} />
                          <span className="truncate">
                            {fila.tipoActivo}
                            {fila.dadoDeBaja && " · Dado de baja"}
                          </span>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      <p>{formatSoles(fila.resumen.costoCentavos)}</p>
                      <p className="text-xs text-muted-foreground">{formatFecha(fila.fechaAdquisicion)}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      <p>{formatTasa(fila.resumen.tasaAnual)} anual</p>
                      <p className="text-xs text-muted-foreground">{formatTasa(fila.resumen.tasaTrimestral)} trim.</p>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatSoles(fila.resumen.acumuladoCentavos)}</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatSoles(fila.resumen.valorNetoCentavos)}
                    </TableCell>
                    <TableCell>
                      <EstadoDepreciacionBadge estado={fila.resumen.estado} />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Link
                        href={`/activos/${fila.id}#depreciacion`}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Ver
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {pagina.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    {mensajeVacio}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} activos
          </p>
          <Pagination page={page} totalPages={totalPages} filtros={filtros} />
        </div>
      )}

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Tasas de depreciación configuradas</p>
          <p className="text-xs text-muted-foreground">La tasa trimestral es la anual dividida entre 4.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Tipo de activo</TableHead>
                <TableHead className="text-right">Tasa anual</TableHead>
                <TableHead className="text-right">Tasa trimestral</TableHead>
                <TableHead className="pr-6">Configuración</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiposActivo.map((tipo) => {
                const tasa = tipo.tasaDepreciacion?.activa ? parseTasa(tipo.tasaDepreciacion.tasaAnual) : null;
                const { icon: Icon, color } = TIPO_ACTIVO_META[tipo.code];
                return (
                  <TableRow key={tipo.id}>
                    <TableCell className="pl-6">
                      <span className="flex items-center gap-1.5 text-sm">
                        <Icon className="size-3.5 shrink-0" style={{ color }} />
                        {tipo.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatTasa(tasa)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatTasa(tasa === null ? null : tasaTrimestralDesdeAnual(tasa))}
                    </TableCell>
                    <TableCell className="pr-6 text-sm">
                      {tasa === null ? (
                        <span style={{ color: "var(--color-critical)" }}>Pendiente</span>
                      ) : (
                        <span className="text-muted-foreground">Configurada</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

function hayFiltros(filtros: FiltrosDepreciacion): boolean {
  return Boolean(filtros.q || filtros.tipoActivoId || filtros.estado || filtros.anio || filtros.trimestre);
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tabular-nums" title={value}>
            {value}
          </p>
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

function buildHref(filtros: FiltrosDepreciacion, cambios: Partial<FiltrosDepreciacion & { page: string }>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filtros, ...cambios })) {
    if (value) params.set(key, value);
  }
  return `/depreciacion?${params.toString()}`;
}

function SortLink({
  columna,
  filtros,
  children,
}: {
  columna: ColumnaOrdenable;
  filtros: FiltrosDepreciacion;
  children: React.ReactNode;
}) {
  const activa = (filtros.sort ?? "codigo") === columna;
  const desc = activa && filtros.dir === "desc";
  const Arrow = desc ? ArrowDownIcon : ArrowUpIcon;
  return (
    <Link
      href={buildHref(filtros, { sort: columna, dir: activa && !desc ? "desc" : "asc", page: "" })}
      className="inline-flex items-center gap-1 hover:text-foreground"
      scroll={false}
    >
      {children}
      <Arrow className={`size-3 ${activa ? "opacity-100" : "opacity-0"}`} aria-hidden />
    </Link>
  );
}

function SortableHead({
  columna,
  filtros,
  className,
  children,
}: {
  columna: ColumnaOrdenable;
  filtros: FiltrosDepreciacion;
  className?: string;
  children: React.ReactNode;
}) {
  const activa = (filtros.sort ?? "codigo") === columna;
  const desc = activa && filtros.dir === "desc";
  return (
    <TableHead className={className} aria-sort={activa ? (desc ? "descending" : "ascending") : undefined}>
      <SortLink columna={columna} filtros={filtros}>
        {children}
      </SortLink>
    </TableHead>
  );
}

function Pagination({ page, totalPages, filtros }: { page: number; totalPages: number; filtros: FiltrosDepreciacion }) {
  if (totalPages <= 1) return null;
  const className = (active: boolean, disabled: boolean) =>
    `flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-sm ${
      active ? "bg-primary text-primary-foreground" : disabled ? "text-muted-foreground/50" : "text-foreground hover:bg-muted"
    }`;
  const paginas = Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  return (
    <nav className="flex items-center gap-1" aria-label="Paginación">
      {page <= 1 ? (
        <span className={className(false, true)}>«</span>
      ) : (
        <Link href={buildHref(filtros, { page: String(page - 1) })} className={className(false, false)} aria-label="Página anterior">
          «
        </Link>
      )}
      {paginas.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - paginas[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link href={buildHref(filtros, { page: String(p) })} className={className(p === page, false)} aria-current={p === page ? "page" : undefined}>
            {p}
          </Link>
        </span>
      ))}
      {page >= totalPages ? (
        <span className={className(false, true)}>»</span>
      ) : (
        <Link href={buildHref(filtros, { page: String(page + 1) })} className={className(false, false)} aria-label="Página siguiente">
          »
        </Link>
      )}
    </nav>
  );
}
