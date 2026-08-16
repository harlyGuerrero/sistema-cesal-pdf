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
import { ROL_USUARIO_LABELS } from "@/lib/usuarios/labels";
import { requireSuperAdmin } from "@/lib/auth/session";

export default async function UsuariosPage() {
  await requireSuperAdmin();
  const usuarios = await prisma.usuario.findMany({ orderBy: { nombre: "asc" } });

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Quién opera el sistema y con qué rol.</p>
        </div>
        <Button render={<Link href="/usuarios/nuevo" />} nativeButton={false}>
          Nuevo usuario
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell>
                <Link href={`/usuarios/${usuario.id}`} className="hover:underline">
                  {usuario.nombre}
                </Link>
              </TableCell>
              <TableCell>{usuario.email}</TableCell>
              <TableCell>
                <Badge variant={usuario.rol === "SUPER_ADMIN" ? "default" : "outline"}>
                  {ROL_USUARIO_LABELS[usuario.rol]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={usuario.estado ? "outline" : "secondary"}>
                  {usuario.estado ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {usuarios.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Sin usuarios todavía.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}
