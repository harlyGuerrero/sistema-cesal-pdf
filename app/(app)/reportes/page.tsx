import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ESTADO_PATRIMONIAL_LABELS,
  ESTADO_PATRIMONIAL_OPTIONS,
  TIPO_ACTIVO_CODE_ORDER,
} from "@/lib/activos/labels";
import type { EstadoPatrimonial, Prisma } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 30;
const SIN_UBICACION = "__none__";

// Fase 12 de Activos: reporte de inventario por ubicación y tipo. Sin sede
// elegida, agrupa por Sede; con una sede elegida, "entra" un nivel y agrupa
// por Unidad Operativa dentro de ella — mismo patrón de drill-down que
// Sede -> Unidad Operativa -> Ambiente del resto del sistema (Fase 5).
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{
    sedeId?: string;
    tipoActivoId?: string;
    estado?: string;
    page?: string;
  }>;
}) {
  const { sedeId, tipoActivoId, estado, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const filterWhere: Prisma.ActivoWhereInput = {
    ...(sedeId && sedeId !== "all" ? { sedeId } : {}),
    ...(tipoActivoId && tipoActivoId !== "all" ? { tipoActivoId } : {}),
    ...(estado && estado !== "all" ? { estadoPatrimonial: estado as EstadoPatrimonial } : {}),
  };

  const [sedes, tiposActivo] = await Promise.all([
    prisma.sede.findMany({ orderBy: { name: "asc" } }),
    prisma.tipoActivo.findMany(),
  ]);
  const tipoActivoByCode = new Map(tiposActivo.map((tipo) => [tipo.code, tipo]));
  const tipoActivoById = new Map(tiposActivo.map((tipo) => [tipo.id, tipo]));
  const columnas = TIPO_ACTIVO_CODE_ORDER.map((code) => tipoActivoByCode.get(code)).filter(
    (tipo): tipo is NonNullable<typeof tipo> => tipo != null
  );

  const sedeSeleccionada = sedeId && sedeId !== "all" ? sedes.find((s) => s.id === sedeId) : undefined;

  const [matrizGrupos, unidadesDeSede, detalle, totalDetalle] = await Promise.all([
    sedeSeleccionada
      ? prisma.activo.groupBy({
          by: ["unidadOperativaId", "tipoActivoId"],
          where: { ...filterWhere, sedeId: sedeSeleccionada.id },
          _count: true,
        })
      : prisma.activo.groupBy({
          by: ["sedeId", "tipoActivoId"],
          where: filterWhere,
          _count: true,
        }),
    sedeSeleccionada
      ? prisma.unidadOperativa.findMany({ where: { sedeId: sedeSeleccionada.id }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    prisma.activo.findMany({
      where: filterWhere,
      include: { tipoActivo: true, sede: true, unidadOperativa: true, ambiente: true, responsableActual: true },
      orderBy: { nombreActivo: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.activo.count({ where: filterWhere }),
  ]);

  // Fila = Sede (o Unidad Operativa, con sede elegida) -> columna = tipo de
  // activo -> conteo. rowKey usa SIN_UBICACION en vez de null porque los
  // valores de un Map deben compararse por identidad, no por null === null.
  const conteoPorFila = new Map<string, Map<string, number>>();
  for (const grupo of matrizGrupos) {
    const rowKey = sedeSeleccionada
      ? ((grupo as { unidadOperativaId: string | null }).unidadOperativaId ?? SIN_UBICACION)
      : ((grupo as { sedeId: string | null }).sedeId ?? SIN_UBICACION);
    if (!conteoPorFila.has(rowKey)) conteoPorFila.set(rowKey, new Map());
    conteoPorFila.get(rowKey)!.set(grupo.tipoActivoId, grupo._count);
  }

  const filasBase: { key: string; label: string }[] = sedeSeleccionada
    ? unidadesDeSede.map((u) => ({ key: u.id, label: u.name }))
    : sedes.map((s) => ({ key: s.id, label: s.name }));
  if (conteoPorFila.has(SIN_UBICACION)) {
    filasBase.push({ key: SIN_UBICACION, label: sedeSeleccionada ? "Sin unidad operativa" : "Sin sede" });
  }

  const filas = filasBase.map((fila) => {
    const porTipo = conteoPorFila.get(fila.key) ?? new Map<string, number>();
    const counts = columnas.map((tipo) => porTipo.get(tipo.id) ?? 0);
    return { ...fila, counts, total: counts.reduce((a, b) => a + b, 0) };
  });

  const totalesPorColumna = columnas.map((_, i) => filas.reduce((sum, fila) => sum + fila.counts[i], 0));
  const totalGeneral = totalesPorColumna.reduce((a, b) => a + b, 0);

  const totalPages = Math.max(1, Math.ceil(totalDetalle / PAGE_SIZE));

  return (
    <main className="space-y-6 p-6 print:p-8">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-medium">Reportes</h1>
          <p className="text-sm text-muted-foreground">Inventario de activos por ubicación y tipo.</p>
        </div>
        <PrintButton />
      </div>

      <form className="flex flex-wrap gap-2 print:hidden" method="get">
        <Select name="sedeId" defaultValue={sedeId ?? "all"}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las sedes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sedes</SelectItem>
            {sedes.map((sede) => (
              <SelectItem key={sede.id} value={sede.id}>
                {sede.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="tipoActivoId" defaultValue={tipoActivoId ?? "all"}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {tiposActivo.map((tipo) => (
              <SelectItem key={tipo.id} value={tipo.id}>
                {tipo.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="estado" defaultValue={estado ?? "all"}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADO_PATRIMONIAL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {sedeSeleccionada ? `Inventario en ${sedeSeleccionada.name} por unidad operativa` : "Inventario por sede"}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{sedeSeleccionada ? "Unidad operativa" : "Sede"}</TableHead>
                {columnas.map((tipo) => (
                  <TableHead key={tipo.id} className="text-right">
                    {tipo.name}
                  </TableHead>
                ))}
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => (
                <TableRow key={fila.key}>
                  <TableCell>{fila.label}</TableCell>
                  {fila.counts.map((count, i) => (
                    <TableCell key={columnas[i].id} className="text-right tabular-nums">
                      {count.toLocaleString("es-PE")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fila.total.toLocaleString("es-PE")}
                  </TableCell>
                </TableRow>
              ))}
              {filas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnas.length + 2} className="text-center text-muted-foreground">
                    Sin activos que coincidan con el filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {filas.length > 0 && (
              <tfoot>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  {totalesPorColumna.map((total, i) => (
                    <TableCell key={columnas[i].id} className="text-right font-semibold tabular-nums">
                      {total.toLocaleString("es-PE")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {totalGeneral.toLocaleString("es-PE")}
                  </TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-3 break-before-page">
        <h2 className="text-base font-semibold">Detalle de activos ({totalDetalle.toLocaleString("es-PE")})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detalle.map((activo) => (
              <TableRow key={activo.id}>
                <TableCell className="text-sm text-muted-foreground">{activo.codigoPatrimonial ?? "—"}</TableCell>
                <TableCell>
                  <Link href={`/activos/${activo.id}`} className="hover:underline print:no-underline">
                    {activo.nombreActivo}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {tipoActivoById.get(activo.tipoActivoId)?.name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[activo.sede?.name, activo.unidadOperativa?.name, activo.ambiente?.name]
                    .filter(Boolean)
                    .join(" › ") || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{activo.responsableActual?.nombre ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial]}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {detalle.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sin activos que coincidan con el filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm print:hidden">
            <PageLink page={page - 1} disabled={page <= 1} sedeId={sedeId} tipoActivoId={tipoActivoId} estado={estado}>
              Anterior
            </PageLink>
            <span className="text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <PageLink page={page + 1} disabled={page >= totalPages} sedeId={sedeId} tipoActivoId={tipoActivoId} estado={estado}>
              Siguiente
            </PageLink>
          </div>
        )}
      </div>

      <footer className="hidden border-t pt-3 text-xs text-muted-foreground print:block">
        Generado el {new Date().toLocaleDateString("es-PE")} — CESAL, sistema de gestión patrimonial.
      </footer>
    </main>
  );
}

function PageLink({
  page,
  disabled,
  sedeId,
  tipoActivoId,
  estado,
  children,
}: {
  page: number;
  disabled: boolean;
  sedeId?: string;
  tipoActivoId?: string;
  estado?: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-muted-foreground">{children}</span>;
  }
  const params = new URLSearchParams();
  if (sedeId) params.set("sedeId", sedeId);
  if (tipoActivoId) params.set("tipoActivoId", tipoActivoId);
  if (estado) params.set("estado", estado);
  params.set("page", String(page));
  return (
    <Link href={`/reportes?${params.toString()}`} className="hover:underline">
      {children}
    </Link>
  );
}
