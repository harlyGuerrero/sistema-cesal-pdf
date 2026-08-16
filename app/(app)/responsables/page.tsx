import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ResponsablesPage() {
  const responsables = await prisma.responsable.findMany({
    include: { sede: true, _count: { select: { activos: true } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Responsables</h1>
        <Button render={<Link href="/responsables/nuevo" />} nativeButton={false}>
          Nuevo responsable
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Sede</TableHead>
            <TableHead>Activos asignados</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responsables.map((responsable) => (
            <TableRow key={responsable.id}>
              <TableCell>
                <Link href={`/responsables/${responsable.id}`} className="hover:underline">
                  {responsable.nombre}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{responsable.email}</TableCell>
              <TableCell>{responsable.cargo ?? "—"}</TableCell>
              <TableCell>{responsable.sede?.name ?? "—"}</TableCell>
              <TableCell>{responsable._count.activos}</TableCell>
              <TableCell>
                <Badge variant={responsable.estado ? "outline" : "secondary"}>
                  {responsable.estado ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {responsables.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Sin responsables todavía.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}
