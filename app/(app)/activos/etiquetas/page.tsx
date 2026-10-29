import { Suspense } from "react";
import { TagIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { buildActivosWhere } from "@/lib/activos/filtros";
import { codigoBarrasSvg } from "@/lib/activos/codigo-barras";
import { ActivosFilters } from "../activos-filters";
import { EtiquetasImpresion } from "./etiquetas-impresion";

// Tope por tanda: cada etiqueta lleva su SVG y el navegador tiene que
// maquetarlas todas para imprimir. Con más activos se imprime por filtros
// (por sede, por tipo).
const MAX_ETIQUETAS = 1000;

// Fase 67: etiquetas de código de barras en lote, para preparar un inventario.
// Usa los mismos filtros que el listado de activos (ver buildActivosWhere).
// Sin filtro de estado se excluyen los dados de baja: un bien de baja ya no
// se inventaría, pero se puede pedir explícitamente con el filtro Baja.
export default async function EtiquetasActivosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipoActivoId?: string; sedeId?: string; estadoPatrimonial?: string; sort?: string }>;
}) {
  const { q, tipoActivoId, sedeId, estadoPatrimonial, sort } = await searchParams;
  const where = buildActivosWhere({ q, tipoActivoId, sedeId, estadoPatrimonial });
  if (!estadoPatrimonial || estadoPatrimonial === "all") where.estadoPatrimonial = { not: "BAJA" };

  const [activos, total, tiposActivo, sedes] = await Promise.all([
    prisma.activo.findMany({
      where,
      orderBy:
        sort === "nombre"
          ? { nombreActivo: "asc" }
          : sort === "antiguos"
            ? { updatedAt: "asc" }
            : sort === "recientes"
              ? { updatedAt: "desc" }
              : { codigoPatrimonial: "asc" },
      take: MAX_ETIQUETAS,
      select: { id: true, nombreActivo: true, codigoPatrimonial: true, sede: { select: { name: true } } },
    }),
    prisma.activo.count({ where }),
    prisma.tipoActivo.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.sede.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const items = activos.map((activo) => ({
    id: activo.id,
    nombreActivo: activo.nombreActivo,
    codigoPatrimonial: activo.codigoPatrimonial,
    sede: activo.sede?.name ?? null,
    codigoBarrasSvg: codigoBarrasSvg(activo.codigoPatrimonial),
  }));

  return (
    <>
      <PageBreadcrumb items={[{ label: "Imprimir etiquetas" }]} />
      <main className="space-y-6 p-4 sm:p-6 print:space-y-0 print:p-0">
        <div className="flex min-w-0 items-center gap-3 print:hidden">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TagIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-medium">Imprimir etiquetas</h1>
            <p className="text-sm text-muted-foreground">
              Códigos de barras para pegar en cada bien. Filtra por sede o tipo para imprimir por ambiente de
              inventario.
            </p>
          </div>
        </div>

        <Card className="print:hidden">
          <CardContent>
            <Suspense fallback={<div className="h-8" />}>
              <ActivosFilters tiposActivo={tiposActivo} sedes={sedes} />
            </Suspense>
          </CardContent>
        </Card>

        {total > MAX_ETIQUETAS && (
          <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground print:hidden">
            Hay {total.toLocaleString("es-PE")} activos con este filtro; se muestran los primeros{" "}
            {MAX_ETIQUETAS.toLocaleString("es-PE")}. Filtra por sede o tipo para imprimir el resto.
          </p>
        )}

        {activos.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No hay activos que coincidan con el filtro.
          </p>
        ) : (
          <EtiquetasImpresion activos={items} />
        )}
      </main>
    </>
  );
}
