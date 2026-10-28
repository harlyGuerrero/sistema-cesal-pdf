import Link from "next/link";
import { Suspense } from "react";
import { DownloadIcon, HistoryIcon, SearchXIcon, XIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  EncabezadoOrden,
  PaginacionHistorial,
  PestanasConteo,
  VacioHistorial,
} from "@/components/historial/historial-parts";
import { TIPO_MOVIMIENTO_LABELS, TIPO_MOVIMIENTO_OPTIONS } from "@/lib/activos/labels";
import { MOVIMIENTO_META } from "@/lib/activos/movimiento-meta";
import { nombreCompleto } from "@/lib/nombre-completo";
import { buildMovimientosWhere } from "@/lib/activos/movimientos-filtros";
import type { TipoMovimiento } from "@/lib/generated/prisma/client";
import { MovimientosFilters } from "./movimientos-filters";
import { MovimientosTabla } from "./movimientos-tabla";

const PAGE_SIZE = 15;

// Fase 59: el tipo guardado CAMBIO_UBICACION también registra ediciones que
// solo cambiaron el estado (ver movimiento-narrativa.ts), y la fila las
// cuenta como "Cambio de estado". La pestaña tiene que decir lo mismo que
// las filas que filtra.
const ETIQUETA_PESTANA: Record<string, string> = {
  CAMBIO_UBICACION: "Ubicación o estado",
};

interface FilterState {
  tipo?: string;
  sedeId?: string;
  unidadOperativaId?: string;
  q?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  usuarioId?: string;
  activoId?: string;
  sort?: string;
}

function buildHref(filters: FilterState, page?: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/movimientos?${qs}` : "/movimientos";
}

// Fase 12 de Activos, rediseñada en Fase 15 y en Fase 59: historial global
// de movimientos como tabla legible (ver movimientos-tabla.tsx). Las
// pestañas filtran por el tipo guardado y cuentan dentro de los demás
// filtros; la columna Fecha ordena. Mismas consultas, exportación y
// paginación que antes, más los filtros por usuario y por activo.
export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<FilterState & { page?: string }>;
}) {
  const { page: pageParam, ...filters } = await searchParams;
  const { tipo, sedeId, unidadOperativaId, q, fechaDesde, fechaHasta, usuarioId, activoId, sort } = filters;
  const page = Math.max(1, Number(pageParam) || 1);
  const sentido = sort === "asc" ? "asc" : "desc";

  const filtrosSinTipo = { sedeId, unidadOperativaId, q, fechaDesde, fechaHasta, usuarioId, activoId };
  const where = buildMovimientosWhere({ ...filtrosSinTipo, tipo });

  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filtrosSinTipo, tipo })) {
    if (value) exportParams.set(key, value);
  }
  const exportQs = exportParams.toString();
  const exportHref = exportQs ? `/api/movimientos/export?${exportQs}` : "/api/movimientos/export";

  const [movimientos, total, conteosPorTipo, totalGlobal, sedes, unidadesOperativas, usuarios, activoFiltrado] =
    await Promise.all([
      prisma.movimiento.findMany({
        where,
        include: {
          activo: {
            select: {
              id: true,
              nombreActivo: true,
              codigoPatrimonial: true,
              sede: { select: { name: true } },
              unidadOperativa: { select: { name: true } },
              ambiente: { select: { name: true } },
            },
          },
          usuario: { select: { nombres: true, apellidos: true } },
          responsableAnterior: true,
          responsableNuevo: true,
          sedeAnterior: true,
          sedeNueva: true,
          unidadOperativaAnterior: true,
          unidadOperativaNueva: true,
          ambienteAnterior: true,
          ambienteNuevo: true,
        },
        orderBy: { fecha: sentido },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.movimiento.count({ where }),
      prisma.movimiento.groupBy({ by: ["tipo"], where: buildMovimientosWhere(filtrosSinTipo), _count: true }),
      prisma.movimiento.count(),
      prisma.sede.findMany({ orderBy: { name: "asc" } }),
      prisma.unidadOperativa.findMany({
        include: { sede: true },
        orderBy: [{ sede: { name: "asc" } }, { name: "asc" }],
      }),
      prisma.usuario.findMany({
        select: { id: true, nombres: true, apellidos: true },
        orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
      }),
      activoId
        ? prisma.activo.findUnique({ where: { id: activoId }, select: { nombreActivo: true, codigoPatrimonial: true } })
        : Promise.resolve(null),
    ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const conteo = new Map(conteosPorTipo.map((row) => [row.tipo, row._count]));
  const totalSinTipo = conteosPorTipo.reduce((suma, row) => suma + row._count, 0);
  const tipoActivo = tipo && tipo !== "all" ? tipo : undefined;
  const pestanas = [
    { key: "all", label: "Todos", count: totalSinTipo, href: buildHref({ ...filters, tipo: undefined }), activa: !tipoActivo },
    ...TIPO_MOVIMIENTO_OPTIONS.filter((option) => (conteo.get(option.value as TipoMovimiento) ?? 0) > 0 || option.value === tipoActivo).map(
      (option) => {
        const { icon, color } = MOVIMIENTO_META[option.value as TipoMovimiento];
        return {
          key: option.value,
          label: ETIQUETA_PESTANA[option.value] ?? TIPO_MOVIMIENTO_LABELS[option.value],
          count: conteo.get(option.value as TipoMovimiento) ?? 0,
          href: buildHref({ ...filters, tipo: option.value }),
          activa: tipoActivo === option.value,
          icon,
          color,
        };
      }
    ),
  ];
  const hayFiltros = Object.entries({ ...filtrosSinTipo, tipo }).some(([, value]) => value && value !== "all");

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-medium">Historial de movimientos</h1>
          <p className="text-sm text-muted-foreground">Consulta los cambios realizados en los activos de CESAL.</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" render={<a href={exportHref} />} nativeButton={false}>
          <DownloadIcon />
          Exportar a Excel
        </Button>
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            <MovimientosFilters
              sedes={sedes}
              unidadesOperativas={unidadesOperativas}
              usuarios={usuarios.map((usuario) => ({ id: usuario.id, nombre: nombreCompleto(usuario) }))}
            />
          </Suspense>
        </CardContent>
      </Card>

      {activoId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/5 px-4 py-2.5 text-sm ring-1 ring-primary/15">
          <p>
            Historial de{" "}
            <span className="font-medium">
              {activoFiltrado
                ? `${activoFiltrado.nombreActivo} (${activoFiltrado.codigoPatrimonial})`
                : "un activo que ya no existe"}
            </span>
          </p>
          <Link
            href={buildHref({ ...filters, activoId: undefined })}
            className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline"
          >
            <XIcon className="size-3.5" />
            Ver todos los activos
          </Link>
        </div>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-4 py-3">
          <PestanasConteo pestanas={pestanas} etiqueta="Filtrar por tipo de movimiento" />
        </CardHeader>
        <CardContent className="px-0">
          {movimientos.length === 0 ? (
            hayFiltros && totalGlobal > 0 ? (
              <VacioHistorial
                icon={SearchXIcon}
                titulo="Ningún movimiento coincide con la búsqueda"
                texto="Prueba con otro código o nombre, amplía las fechas o usa «Limpiar» para quitar los filtros."
              />
            ) : (
              <VacioHistorial
                icon={HistoryIcon}
                titulo="Todavía no hay movimientos registrados"
                texto="Cada alta, asignación o cambio de ubicación de un activo aparecerá aquí automáticamente."
              />
            )
          ) : (
            <MovimientosTabla
              movimientos={movimientos}
              encabezadoFecha={
                <EncabezadoOrden
                  label="Fecha"
                  sentido={sentido}
                  href={buildHref({ ...filters, sort: sentido === "desc" ? "asc" : undefined })}
                />
              }
            />
          )}
        </CardContent>
      </Card>

      <PaginacionHistorial
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        sustantivo={total === 1 ? "movimiento" : "movimientos"}
        href={(p) => buildHref(filters, p)}
      />
    </main>
  );
}
