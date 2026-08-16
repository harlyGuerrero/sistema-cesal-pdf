import Link from "next/link";
import { notFound } from "next/navigation";
import { IdCardIcon, PackageIcon, UsersIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { FormPageHeader } from "@/components/form-page-header";
import { FormSection } from "@/components/form-section";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { nombreCompleto } from "@/lib/nombre-completo";
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
    <>
      <PageBreadcrumb items={[{ label: nombreCompleto(responsable) }]} />
      <main className="p-6">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-sm">
        <FormPageHeader
          icon={UsersIcon}
          title={nombreCompleto(responsable)}
          description={responsable.email}
        />

        <div className="space-y-5 p-6">
          <FormSection icon={IdCardIcon} title="Datos del responsable" color="var(--color-chart-2)">
            <ResponsableEditForm
              responsableId={responsable.id}
              nombres={responsable.nombres}
              apellidos={responsable.apellidos}
              email={responsable.email}
              cargo={responsable.cargo ?? ""}
              documento={responsable.documento ?? ""}
              sedeId={responsable.sedeId ?? ""}
              sedes={sedes}
            />
          </FormSection>

          <FormSection icon={PackageIcon} title={`Activos asignados (${responsable.activos.length})`} color="var(--primary)">
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
          </FormSection>
        </div>

        <div className="border-t p-6">
          <DeleteResponsableButton responsableId={responsable.id} hasActivos={responsable.activos.length > 0} />
        </div>
      </div>
      </main>
    </>
  );
}
