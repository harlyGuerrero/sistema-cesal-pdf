import { UserCogIcon } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/session";
import { FormPageHeader } from "@/components/form-page-header";
import { FormSection } from "@/components/form-section";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { NewUsuarioForm } from "./new-usuario-form";

export default async function NewUsuarioPage() {
  await requireSuperAdmin();
  return (
    <>
      <PageBreadcrumb items={[{ label: "Nuevo usuario" }]} />
      <main className="p-6">
        <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border bg-card shadow-sm">
          <FormPageHeader
            icon={UserCogIcon}
            title="Nuevo usuario"
            description="Crea una cuenta con acceso al sistema."
          />
          <div className="p-6">
            <FormSection icon={UserCogIcon} title="Datos de la cuenta" color="var(--color-chart-5)">
              <NewUsuarioForm />
            </FormSection>
          </div>
        </div>
      </main>
    </>
  );
}
