import Link from "next/link";
import { Suspense } from "react";
import { DownloadIcon, ScrollTextIcon, SearchXIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilaExpandible } from "@/components/historial/fila-expandible";
import {
  DatosDetalle,
  IconoTipo,
  PaginacionHistorial,
  PestanasConteo,
  VacioHistorial,
} from "@/components/historial/historial-parts";
import { TIPO_ACCION_AUDITORIA_LABELS, TIPO_ACCION_AUDITORIA_META, TIPO_ACCION_AUDITORIA_OPTIONS } from "@/lib/auditoria/labels";
import { narrarAuditoria } from "@/lib/auditoria/narrativa";
import { buildAuditoriaWhere } from "@/lib/auditoria/filtros";
import { nombreCompleto } from "@/lib/nombre-completo";
import { AuditoriaFilters } from "./auditoria-filters";

const PAGE_SIZE = 30;
const ZONA = "America/Lima";
const FECHA = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: ZONA });
const HORA = new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });
const FECHA_EXACTA = new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeStyle: "medium", timeZone: ZONA });

interface FilterState {
  q?: string;
  entidad?: string;
  accion?: string;
  usuarioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

function buildHref(filters: FilterState, page?: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/auditoria?${qs}` : "/auditoria";
}

// Fase 11 de Activos, restilizada en Fase 32 y en Fase 59: quién hizo qué
// en el sistema, distinto del historial de movimientos (qué le pasó a cada
// activo). Fase 59 la lleva a la misma tabla legible que /movimientos: la
// primera columna dice en castellano qué se hizo (lib/auditoria/narrativa.ts),
// las pestañas filtran por acción y cuentan dentro de los demás filtros, y
// el detalle de cada registro se abre en su fila. Sin restricción por rol:
// ADMIN y SUPER_ADMIN la ven igual (ver CLAUDE.md y proxy.ts).
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<FilterState & { page?: string }>;
}) {
  const { page: pageParam, ...filters } = await searchParams;
  const { q, entidad, accion, usuarioId, fechaDesde, fechaHasta } = filters;
  const page = Math.max(1, Number(pageParam) || 1);

  const filtrosSinAccion = { q, entidad, usuarioId, fechaDesde, fechaHasta };
  const where = buildAuditoriaWhere({ ...filtrosSinAccion, accion });

  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filtrosSinAccion, accion })) {
    if (value) exportParams.set(key, value);
  }
  const exportQs = exportParams.toString();
  const exportHref = exportQs ? `/api/auditoria/export?${exportQs}` : "/api/auditoria/export";

  const [logs, total, conteosPorAccion, totalGlobal, usuarios] = await Promise.all([
    prisma.auditoriaLog.findMany({
      where,
      include: { usuario: { select: { nombres: true, apellidos: true } } },
      orderBy: { fecha: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditoriaLog.count({ where }),
    prisma.auditoriaLog.groupBy({ by: ["accion"], where: buildAuditoriaWhere(filtrosSinAccion), _count: true }),
    prisma.auditoriaLog.count(),
    prisma.usuario.findMany({
      select: { id: true, nombres: true, apellidos: true },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
  ]);

  const filas = logs.map((log) => ({ log, n: narrarAuditoria(log.entidad, log.accion, log.detalle, log.entidadId) }));
  // Solo se enlaza a un activo que todavía existe (uno eliminado sigue en
  // la auditoría, pero su ficha ya no).
  const idsActivos = [...new Set(filas.map(({ n }) => n.objeto.activoId).filter((id): id is string => id !== null))];
  const activosExistentes = new Set(
    idsActivos.length > 0
      ? (await prisma.activo.findMany({ where: { id: { in: idsActivos } }, select: { id: true } })).map((a) => a.id)
      : []
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const conteo = new Map(conteosPorAccion.map((row) => [row.accion as string, row._count]));
  const totalSinAccion = conteosPorAccion.reduce((suma, row) => suma + row._count, 0);
  const accionActiva = accion && accion !== "all" ? accion : undefined;
  const pestanas = [
    { key: "all", label: "Todo", count: totalSinAccion, href: buildHref({ ...filters, accion: undefined }), activa: !accionActiva },
    ...TIPO_ACCION_AUDITORIA_OPTIONS.filter((option) => (conteo.get(option.value) ?? 0) > 0 || option.value === accionActiva).map(
      (option) => ({
        key: option.value,
        label: option.label,
        count: conteo.get(option.value) ?? 0,
        href: buildHref({ ...filters, accion: option.value }),
        activa: accionActiva === option.value,
        icon: TIPO_ACCION_AUDITORIA_META[option.value]?.icon,
        color: TIPO_ACCION_AUDITORIA_META[option.value]?.color,
      })
    ),
  ];
  const hayFiltros = Object.values({ ...filtrosSinAccion, accion }).some((value) => value && value !== "all");

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-medium">Auditoría</h1>
          <p className="text-sm text-muted-foreground">
            Quién hizo qué en el sistema y cuándo. Lo que le pasó a cada activo está en el historial de movimientos.
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" render={<a href={exportHref} />} nativeButton={false}>
          <DownloadIcon />
          Exportar a Excel
        </Button>
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-8" />}>
            <AuditoriaFilters usuarios={usuarios.map((usuario) => ({ id: usuario.id, nombre: nombreCompleto(usuario) }))} />
          </Suspense>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-4 py-3">
          <PestanasConteo pestanas={pestanas} etiqueta="Filtrar por acción" />
        </CardHeader>
        <CardContent className="px-0">
          {filas.length === 0 ? (
            hayFiltros && totalGlobal > 0 ? (
              <VacioHistorial
                icon={SearchXIcon}
                titulo="Ningún registro coincide con la búsqueda"
                texto="Prueba con otro nombre o código, amplía las fechas o usa «Limpiar» para quitar los filtros."
              />
            ) : (
              <VacioHistorial
                icon={ScrollTextIcon}
                titulo="Todavía no hay acciones registradas"
                texto="Cada vez que alguien crea, edita o elimina algo en el sistema, quedará anotado aquí."
              />
            )
          ) : (
            <Table className="table-fixed max-md:block">
              <TableHeader className="max-md:hidden">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[44%] pl-4">Qué se hizo</TableHead>
                  <TableHead>Sobre</TableHead>
                  <TableHead>Quién lo hizo</TableHead>
                  <TableHead className="w-32">Fecha</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Detalles</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block max-md:divide-y">
                {filas.map(({ log, n }) => {
                  const meta = TIPO_ACCION_AUDITORIA_META[log.accion] ?? { icon: ScrollTextIcon, color: "var(--color-neutral)" };
                  const quien = log.usuario ? nombreCompleto(log.usuario) : "Usuario no registrado";
                  const enlaceActivo = n.objeto.activoId && activosExistentes.has(n.objeto.activoId) ? `/activos/${n.objeto.activoId}` : null;
                  return (
                    <FilaExpandible
                      key={log.id}
                      columnas={5}
                      etiqueta={n.titulo}
                      celdas={
                        <>
                          <TableCell className="pl-4 whitespace-normal max-md:col-start-1 max-md:row-start-1 max-md:p-0">
                            <div className="flex gap-3">
                              <IconoTipo icon={meta.icon} color={meta.color} />
                              <div className="min-w-0 space-y-0.5">
                                <p className="leading-snug font-medium text-pretty">{n.titulo}</p>
                                <p className="text-xs text-muted-foreground">{TIPO_ACCION_AUDITORIA_LABELS[log.accion] ?? log.accion}</p>
                                {n.resumen.map((linea) => (
                                  <p key={linea} className="text-sm text-muted-foreground">
                                    {linea}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-normal max-md:col-span-2 max-md:p-0 max-md:pl-10">
                            {/* El tipo sobra cuando el nombre ya lo dice
                                ("Depreciación trimestral"). */}
                            {!n.objeto.nombre?.toLowerCase().startsWith(n.objeto.tipo.toLowerCase()) && (
                              <p className="text-xs text-muted-foreground">{n.objeto.tipo}</p>
                            )}
                            {n.objeto.nombre &&
                              (enlaceActivo ? (
                                <Link href={enlaceActivo} className="font-medium underline-offset-4 hover:text-primary hover:underline">
                                  {n.objeto.nombre}
                                </Link>
                              ) : (
                                <p className="font-medium">{n.objeto.nombre}</p>
                              ))}
                            {n.objeto.codigo && <p className="font-mono text-xs text-muted-foreground">{n.objeto.codigo}</p>}
                          </TableCell>
                          <TableCell className="whitespace-normal max-md:col-span-2 max-md:p-0 max-md:pl-10 max-md:text-xs max-md:text-muted-foreground">
                            <span className="md:hidden">Por </span>
                            {quien}
                          </TableCell>
                          <TableCell className="tabular-nums max-md:col-span-2 max-md:p-0 max-md:pl-10 max-md:text-xs max-md:text-muted-foreground">
                            <time dateTime={log.fecha.toISOString()}>
                              {FECHA.format(log.fecha)}
                              <span className="block text-xs text-muted-foreground max-md:inline max-md:before:content-['_·_']">
                                {HORA.format(log.fecha)}
                              </span>
                            </time>
                          </TableCell>
                        </>
                      }
                      detalle={
                        <div className="space-y-4">
                          {n.detalles.length > 0 ? (
                            <DatosDetalle datos={n.detalles} />
                          ) : (
                            <p className="text-sm text-muted-foreground">Este registro no guarda más detalles.</p>
                          )}
                          <DatosDetalle
                            datos={[
                              { label: "Fecha exacta", value: <span className="first-letter:uppercase">{FECHA_EXACTA.format(log.fecha)}</span> },
                            ]}
                          />
                          {enlaceActivo && (
                            <Link href={enlaceActivo} className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
                              Ver el activo
                            </Link>
                          )}
                        </div>
                      }
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaginacionHistorial
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        sustantivo={total === 1 ? "registro" : "registros"}
        href={(p) => buildHref(filters, p)}
      />
    </main>
  );
}
