import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Fase 2 de Activos: los 6 tipos de activo patrimonial son fijos y cerrados
// (ver ARCHITECTURE.md 5.2, CLAUDE.md regla 5) — a diferencia de Sedes o de
// Categoria/Subcategoria (Fase 3), esta pantalla es solo lectura a propósito,
// no le falta el CRUD.
export default async function TiposActivoPage() {
  const tiposActivo = await prisma.tipoActivo.findMany({
    include: { _count: { select: { activos: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Tipos de Activo</h1>
        <p className="text-sm text-muted-foreground">
          Clasificación patrimonial principal — 6 tipos fijos, no editables desde el sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Catálogo cerrado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Activos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiposActivo.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell>{tipo.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{tipo.code}</TableCell>
                  <TableCell>{tipo._count.activos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
