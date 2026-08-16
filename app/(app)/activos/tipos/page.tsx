import { FolderTreeIcon, ListTreeIcon, PackageIcon, TagIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIPO_ACTIVO_META } from "@/lib/activos/tipo-activo-meta";

// Fase 34: rediseño visual de /activos/tipos — mismo lenguaje de stat cards
// que el resto de módulos, y cierra un hueco de jerarquía real: TIPO_ACTIVO_-
// META (ícono + color por TipoActivoCode) ya se usa en todos lados para
// pintar el tipo de un activo (ActivosTable, la ficha técnica, el Dashboard)
// menos en el propio catálogo de tipos, que hasta ahora los listaba sin
// color ni ícono. Sigue siendo de solo lectura a propósito (Fase 2 de
// Activos: los 6 tipos son fijos y cerrados, no editables desde el sistema).
export default async function TiposActivoPage() {
  const [tiposActivo, totalSubcategorias] = await Promise.all([
    prisma.tipoActivo.findMany({
      include: { _count: { select: { activos: true, categorias: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.subcategoriaActivo.count(),
  ]);

  const totalActivos = tiposActivo.reduce((sum, tipo) => sum + tipo._count.activos, 0);
  const totalCategorias = tiposActivo.reduce((sum, tipo) => sum + tipo._count.categorias, 0);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Tipos de Activo</h1>
        <p className="text-sm text-muted-foreground">
          Clasificación patrimonial principal — 6 tipos fijos, no editables desde el sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tipos de activo" value={tiposActivo.length} icon={TagIcon} color="var(--primary)" hint="catálogo cerrado" />
        <StatCard
          label="Activos clasificados"
          value={totalActivos}
          icon={PackageIcon}
          color="var(--color-good)"
          hint="en total"
        />
        <StatCard
          label="Categorías registradas"
          value={totalCategorias}
          icon={FolderTreeIcon}
          color="var(--color-chart-2)"
          hint="bajo los 6 tipos"
        />
        <StatCard
          label="Subcategorías registradas"
          value={totalSubcategorias}
          icon={ListTreeIcon}
          color="var(--color-chart-4)"
          hint="en total"
        />
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Catálogo cerrado</p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Categorías</TableHead>
                <TableHead className="pr-6">Activos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiposActivo.map((tipo) => {
                const { icon: Icon, color } = TIPO_ACTIVO_META[tipo.code];
                return (
                  <TableRow key={tipo.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="text-sm">{tipo.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{tipo.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tipo._count.categorias}</TableCell>
                    <TableCell className="pr-6">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
                      >
                        {tipo._count.activos}
                      </span>
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
