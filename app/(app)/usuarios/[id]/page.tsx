import { notFound } from "next/navigation";
import { UserCogIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { FormPageHeader } from "@/components/form-page-header";
import { FormSection } from "@/components/form-section";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { UsuarioEditForm } from "./usuario-edit-form";
import { DeleteUsuarioButton } from "./delete-usuario-button";

export default async function UsuarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireSuperAdmin();
  const { id } = await params;

  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    notFound();
  }

  const esUsuarioActual = actor.id === usuario.id;

  return (
    <>
      <PageBreadcrumb items={[{ label: "Usuarios", href: "/usuarios" }, { label: usuario.nombre }]} />
      <main className="p-6">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-sm">
          <FormPageHeader
            icon={UserCogIcon}
            title={usuario.nombre}
            description={usuario.email}
          />

          <div className="p-6">
            <FormSection icon={UserCogIcon} title="Datos de la cuenta" color="var(--color-chart-5)">
              <UsuarioEditForm
                usuarioId={usuario.id}
                nombre={usuario.nombre}
                email={usuario.email}
                rol={usuario.rol}
                estado={usuario.estado}
                esUsuarioActual={esUsuarioActual}
              />
            </FormSection>
          </div>

          {!esUsuarioActual && (
            <div className="border-t p-6">
              <DeleteUsuarioButton usuarioId={usuario.id} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
