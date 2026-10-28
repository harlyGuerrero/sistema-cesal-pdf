import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DownloadIcon, PackageSearchIcon, XIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginacionHistorial, VacioHistorial } from "@/components/historial/historial-parts";
import { ESTADO_PATRIMONIAL_COLOR_VAR, ESTADO_PATRIMONIAL_LABELS } from "@/lib/activos/labels";
import { TIPO_ACTIVO_META } from "@/lib/activos/tipo-activo-meta";
import { nombreCompleto } from "@/lib/nombre-completo";
import { cn } from "@/lib/utils";
import { formatPeriodo, formatSoles } from "@/lib/depreciacion/calculo";
import {
  buildCeldaWhere,
  buildReporteMatriz,
  buildReportesWhere,
  cargarMontosReporte,
  filtrosLegibles,
  tituloSeleccion,
  ultimoTrimestreDepreciado,
} from "@/lib/activos/reportes";
import { requireSessionUsuario } from "@/lib/auth/session";
import { ReportesFilters } from "./reportes-filters";
import { DesgloseAncla } from "./desglose-ancla";

const PAGE_SIZE = 30;

// El título de la pestaña/encabezado de impresión — antes heredaba el
// genérico de la Fase 0 ("Importación de Productos", ver app/layout.tsx).
export const metadata: Metadata = { title: "Reportes" };

interface FilterState {
  sedeId?: string;
  tipoActivoId?: string;
  estado?: string;
  fila?: string;
  col?: string;
}

function buildHref(filters: FilterState, page?: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/reportes?${qs}` : "/reportes";
}

// Fase 12 de Activos, restilizada en Fase 34 y rediseñada en Fase 59:
// inventario por ubicación y tipo como una matriz que se interroga. Sin sede
// elegida agrupa por Sede; con una sede, por Unidad Operativa dentro de ella
// (mismo desglose que el resto del sistema, Fase 5). Cada cifra de la
// matriz es un enlace: elegir una celda, o el total de una fila o de una
// columna, deja debajo exactamente esos activos. Los montos son el costo de
// adquisición y el valor neto que calcula Depreciación (ya no el campo
// manual "valor contable"), y la exportación a Excel lleva lo mismo.
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<FilterState & { page?: string }>;
}) {
  const { page: pageParam, ...filters } = await searchParams;
  const { sedeId, tipoActivoId, estado, fila, col } = filters;
  const page = Math.max(1, Number(pageParam) || 1);
  const porUnidad = Boolean(sedeId && sedeId !== "all");

  const filterWhere = buildReportesWhere({ sedeId, tipoActivoId, estado });
  const detalleWhere = { AND: [filterWhere, buildCeldaWhere({ fila, col }, porUnidad)] };

  const [sedes, tiposActivo, usuario] = await Promise.all([
    prisma.sede.findMany({ orderBy: { name: "asc" } }),
    prisma.tipoActivo.findMany(),
    requireSessionUsuario(),
  ]);
  const tipoActivoById = new Map(tiposActivo.map((tipo) => [tipo.id, tipo]));

  const [matriz, montos, detalle, totalDetalle, corte] = await Promise.all([
    buildReporteMatriz(filterWhere, { sedeId, tipoActivoId, estado }),
    cargarMontosReporte(filterWhere, porUnidad),
    prisma.activo.findMany({
      where: detalleWhere,
      include: { tipoActivo: true, sede: true, unidadOperativa: true, ambiente: true, responsableActual: true },
      orderBy: { nombreActivo: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.activo.count({ where: detalleWhere }),
    ultimoTrimestreDepreciado(),
  ]);
  const { columnas, filas, totalesPorColumna, totalGeneral, sedeSeleccionada } = matriz;

  const totalPages = Math.max(1, Math.ceil(totalDetalle / PAGE_SIZE));
  const ambito = sedeSeleccionada ? "Unidad operativa" : "Sede";

  const hayCelda = Boolean(fila || col);
  const tituloDesglose = tituloSeleccion(matriz, tipoActivoById, { fila, col });
  const celdaHref = (celda: { fila?: string; col?: string }) => {
    const misma = (celda.fila ?? "") === (fila ?? "") && (celda.col ?? "") === (col ?? "");
    return buildHref({ ...filters, fila: misma ? undefined : celda.fila, col: misma ? undefined : celda.col })
  };
  const esCelda = (celda: { fila?: string; col?: string }) => (celda.fila ?? "") === (fila ?? "") && (celda.col ?? "") === (col ?? "");

  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) exportParams.set(key, value);
  }
  const exportQs = exportParams.toString();
  const exportHref = exportQs ? `/api/reportes/export?${exportQs}` : "/api/reportes/export";

  const descripcionFiltros = filtrosLegibles(matriz, tipoActivoById, { tipoActivoId, estado }, ESTADO_PATRIMONIAL_LABELS);
  const hoy = new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });

  return (
    <main className="space-y-6 p-4 sm:p-6 print:space-y-4 print:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-medium print:text-lg print:font-semibold">
            Reportes<span className="hidden print:inline"> · Inventario patrimonial de CESAL</span>
          </h1>
          <p className="text-sm text-muted-foreground print:hidden">
            Inventario por sede y tipo de activo. Elige una cifra de la tabla para ver esos activos.
          </p>
          <p className="hidden text-xs text-muted-foreground print:block">
            {descripcionFiltros} · Generado el {hoy} por {usuario.nombre}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <PrintButton className="w-full sm:w-auto" />
          <Button variant="outline" className="w-full sm:w-auto" render={<a href={exportHref} />} nativeButton={false}>
            <DownloadIcon />
            Exportar a Excel
          </Button>
        </div>
      </div>

      <Card size="sm" className="break-inside-avoid">
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:flex-wrap sm:items-end">
            <Cifra label="Activos" value={totalGeneral.toLocaleString("es-PE")} />
            <Cifra label="Costo de adquisición" value={formatSoles(montos.costoCentavos)} />
            <Cifra label="Valor neto contable" value={formatSoles(montos.valorNetoCentavos)} />
            <div className="col-span-2 sm:ml-auto sm:text-right">
              <dt className="text-xs text-muted-foreground">Depreciación registrada hasta</dt>
              <dd className="text-sm font-medium">
                {corte ? (
                  formatPeriodo(corte)
                ) : (
                  <Link href="/depreciacion" className="text-primary underline-offset-4 hover:underline">
                    Ningún trimestre procesado
                  </Link>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            <ReportesFilters sedes={sedes} tiposActivo={tiposActivo} />
          </Suspense>
        </CardContent>
      </Card>

      <Card className="gap-0 break-inside-avoid py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm font-semibold">
            {sedeSeleccionada ? `Inventario de ${sedeSeleccionada.name} por unidad operativa` : "Inventario por sede"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {filas.length === 0 || totalGeneral === 0 ? (
            <VacioHistorial
              icon={PackageSearchIcon}
              titulo="Ningún activo coincide con los filtros"
              texto="Cambia la sede, el tipo o el estado, o usa «Limpiar» para ver todo el inventario."
            />
          ) : (
            <Table className="print:text-[10px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 z-10 min-w-36 bg-card pl-4 align-bottom">{ambito}</TableHead>
                  {columnas.map((tipo) => {
                    const { icon: Icon, color } = TIPO_ACTIVO_META[tipo.code];
                    return (
                      <TableHead key={tipo.id} className="h-auto min-w-24 py-2 text-right align-bottom whitespace-normal print:min-w-0">
                        <span className="flex flex-col items-end gap-1 leading-tight">
                          <Icon className="size-3.5 print:hidden" style={{ color }} aria-hidden />
                          {tipo.name}
                        </span>
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-right align-bottom">Total</TableHead>
                  <TableHead className="min-w-32 text-right align-bottom">Costo</TableHead>
                  <TableHead className="min-w-32 pr-4 text-right align-bottom">Valor neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => {
                  const montoFila = montos.porFila.get(f.key);
                  return (
                    <TableRow key={f.key} className={cn("hover:bg-transparent", fila === f.key && "bg-primary/5 hover:bg-primary/5")}>
                      {/* Columna fija: fondo opaco del mismo tono que su fila, para
                          tapar las cifras que pasan por debajo al deslizar. */}
                      <TableCell
                        className={cn(
                          "sticky left-0 z-10 pl-4 font-medium whitespace-normal",
                          fila === f.key ? "bg-[color-mix(in_oklch,var(--primary)_5%,var(--card))]" : "bg-card"
                        )}
                      >
                        {f.label}
                      </TableCell>
                      {f.counts.map((count, i) => (
                        <CeldaCifra
                          key={columnas[i].id}
                          valor={count}
                          href={celdaHref({ fila: f.key, col: columnas[i].id })}
                          elegida={esCelda({ fila: f.key, col: columnas[i].id })}
                          etiqueta={`${columnas[i].name} en ${f.label}`}
                        />
                      ))}
                      <CeldaCifra
                        valor={f.total}
                        href={celdaHref({ fila: f.key })}
                        elegida={esCelda({ fila: f.key })}
                        etiqueta={`Todos los activos en ${f.label}`}
                        fuerte
                      />
                      <TableCell className="text-right tabular-nums">{formatSoles(montoFila?.costoCentavos ?? 0)}</TableCell>
                      <TableCell className="pr-4 text-right tabular-nums">{formatSoles(montoFila?.valorNetoCentavos ?? 0)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <tfoot className="border-t bg-muted/40 font-semibold">
                <TableRow className="hover:bg-transparent">
                  <TableCell className="sticky left-0 z-10 bg-[color-mix(in_oklch,var(--muted)_40%,var(--card))] pl-4">Total</TableCell>
                  {totalesPorColumna.map((total, i) => (
                    <CeldaCifra
                      key={columnas[i].id}
                      valor={total}
                      href={celdaHref({ col: columnas[i].id })}
                      elegida={esCelda({ col: columnas[i].id })}
                      etiqueta={`${columnas[i].name} en ${sedeSeleccionada ? sedeSeleccionada.name : "todas las sedes"}`}
                      fuerte
                    />
                  ))}
                  <TableCell className="text-right tabular-nums">{totalGeneral.toLocaleString("es-PE")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatSoles(montos.costoCentavos)}</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{formatSoles(montos.valorNetoCentavos)}</TableCell>
                </TableRow>
              </tfoot>
            </Table>
          )}
        </CardContent>
        {totalGeneral > 0 && (
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">
            Valor neto = costo de adquisición menos la depreciación registrada
            {corte ? ` hasta el ${formatPeriodo(corte)}` : " (todavía no se procesó ningún trimestre)"}.
            {montos.sinCosto > 0 &&
              ` ${montos.sinCosto.toLocaleString("es-PE")} ${montos.sinCosto === 1 ? "activo no tiene" : "activos no tienen"} costo registrado y no ${montos.sinCosto === 1 ? "suma" : "suman"} a los montos.`}
          </p>
        )}
      </Card>

      <Suspense fallback={null}>
        <DesgloseAncla />
      </Suspense>
      <Card
        id="desglose"
        className={cn("gap-0 py-0 print:break-before-page", hayCelda && "ring-primary/40 print:ring-foreground/10")}
      >
        <CardHeader className={cn("border-b py-3", hayCelda && "bg-primary/5 print:bg-transparent")}>
          <CardTitle className={cn("text-sm font-semibold", hayCelda && "text-primary print:text-foreground")}>
            {tituloDesglose}
          </CardTitle>
          <CardDescription>
            {totalDetalle.toLocaleString("es-PE")} {totalDetalle === 1 ? "activo" : "activos"}
          </CardDescription>
          {hayCelda && (
            <CardAction className="print:hidden">
              <Link
                href={buildHref({ ...filters, fila: undefined, col: undefined })}
                className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline"
              >
                <XIcon className="size-3.5" />
                Ver todos
              </Link>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {detalle.length === 0 ? (
            <VacioHistorial
              icon={PackageSearchIcon}
              titulo="Sin activos en esta selección"
              texto="Elige otra cifra de la tabla o quita la selección."
            />
          ) : (
            <Table className="min-w-[56rem] print:min-w-0 print:text-[10px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Activo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="pr-4 text-right">Valor neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalle.map((activo) => {
                  const estadoColor = ESTADO_PATRIMONIAL_COLOR_VAR[activo.estadoPatrimonial] ?? "var(--color-neutral)";
                  const monto = montos.porActivo.get(activo.id);
                  const ubicacion = [activo.sede?.name, activo.unidadOperativa?.name, activo.ambiente?.name].filter(Boolean).join(" › ");
                  return (
                    <TableRow key={activo.id}>
                      <TableCell className="pl-4 whitespace-normal">
                        <Link href={`/activos/${activo.id}`} className="font-medium underline-offset-4 hover:text-primary hover:underline print:no-underline">
                          {activo.nombreActivo}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">{activo.codigoPatrimonial}</p>
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{activo.tipoActivo.name}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {ubicacion || "Sin ubicación registrada"}
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {activo.responsableActual ? nombreCompleto(activo.responsableActual) : "Sin responsable"}
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: `color-mix(in oklch, ${estadoColor} 15%, transparent)`, color: estadoColor }}
                        >
                          {ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial]}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {activo.numeroFactura ?? "Sin factura"}
                        {activo.numeroFC && <p className="text-xs">FC {activo.numeroFC}</p>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {monto?.costoCentavos != null ? formatSoles(monto.costoCentavos) : <span className="text-muted-foreground">Sin costo</span>}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-medium tabular-nums">
                        {monto?.valorNetoCentavos != null ? formatSoles(monto.valorNetoCentavos) : <span className="font-normal text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="print:hidden">
        <PaginacionHistorial
          page={page}
          totalPages={totalPages}
          total={totalDetalle}
          pageSize={PAGE_SIZE}
          sustantivo={totalDetalle === 1 ? "activo" : "activos"}
          href={(p) => buildHref(filters, p)}
        />
      </div>

      <footer className="hidden border-t pt-3 text-xs text-muted-foreground print:block">
        Generado el {hoy} por {usuario.nombre} — CESAL, sistema de gestión patrimonial.
        {totalPages > 1 && ` El detalle impreso es la página ${page} de ${totalPages}; el detalle completo está en la exportación a Excel.`}
      </footer>
    </main>
  );
}

function Cifra({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

// Una cifra de la matriz. Si es mayor que cero es un enlace al desglose; la
// elegida lleva el tinte y el contorno azul. Un cero no lleva a ningún lado.
function CeldaCifra({
  valor,
  href,
  elegida,
  etiqueta,
  fuerte = false,
}: {
  valor: number;
  href: string;
  elegida: boolean;
  etiqueta: string;
  fuerte?: boolean;
}) {
  return (
    <TableCell className={cn("p-1 text-right tabular-nums", fuerte && "font-semibold")}>
      {valor === 0 ? (
        <span className="block px-2 py-1 text-muted-foreground">0</span>
      ) : (
        <Link
          href={href}
          scroll={false}
          aria-label={`${etiqueta}: ${valor}`}
          aria-current={elegida ? "true" : undefined}
          className={cn(
            "block rounded-md px-2 py-1 underline underline-offset-4 outline-none hover:bg-primary/10 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 print:no-underline",
            elegida ? "bg-primary/10 text-primary ring-2 ring-primary ring-inset" : "text-primary"
          )}
        >
          {valor.toLocaleString("es-PE")}
        </Link>
      )}
    </TableCell>
  );
}
