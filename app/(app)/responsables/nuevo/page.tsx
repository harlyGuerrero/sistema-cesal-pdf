import { IdCardIcon, UsersIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { FormPageHeader } from "@/components/form-page-header";
import { FormSection } from "@/components/form-section";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { NewResponsableForm } from "./new-responsable-form";

export default async function NewResponsablePage() {
  const sedes = await prisma.sede.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <PageBreadcrumb
        items={[{ label: "Responsables", href: "/responsables" }, { label: "Nuevo responsable" }]}
      />
      <main className="p-6">
        <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border bg-card shadow-sm">
          <FormPageHeader
            icon={UsersIcon}
            title="Nuevo responsable"
            description="Registra a la persona a la que se le pueden asignar activos."
          />
          <div className="p-6">
            <FormSection icon={IdCardIcon} title="Datos del responsable" color="var(--color-chart-2)">
              <NewResponsableForm sedes={sedes} />
            </FormSection>
          </div>
        </div>
      </main>
    </>
  );
}
