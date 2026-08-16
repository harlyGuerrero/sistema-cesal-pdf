import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsableEditForm } from "./responsable-edit-form";
import { DeleteResponsableButton } from "./delete-responsable-button";

export default async function ResponsableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [responsable, sedes] = await Promise.all([
    prisma.responsable.findUnique({
      where: { id },
      include: { activos: { orderBy: { nombreActivo: "asc" } } },
    }),
    prisma.sede.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!responsable) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">{responsable.nombre}</h1>
        <Link href="/responsables" className="text-sm text-muted-foreground hover:underline">
          ← Volver a responsables
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Editar</h2>
        <ResponsableEditForm
          responsableId={responsable.id}
          nombre={responsable.nombre}
          email={responsable.email}
          cargo={responsable.cargo ?? ""}
          documento={responsable.documento ?? ""}
          sedeId={responsable.sedeId ?? ""}
          sedes={sedes}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Activos asignados ({responsable.activos.length})
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código patrimonial</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responsable.activos.map((activo) => (
              <TableRow key={activo.id}>
                <TableCell>
                  <Link href={`/activos/${activo.id}`} className="hover:underline">
                    {activo.nombreActivo}
                  </Link>
                </TableCell>
                <TableCell>{activo.codigoPatrimonial ?? "—"}</TableCell>
              </TableRow>
            ))}
            {responsable.activos.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Sin activos asignados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="border-t pt-4">
        <DeleteResponsableButton responsableId={responsable.id} hasActivos={responsable.activos.length > 0} />
      </section>
    </main>
  );
}
