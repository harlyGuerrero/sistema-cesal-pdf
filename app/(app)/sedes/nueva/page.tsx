import { Building2Icon, MapPinIcon } from "lucide-react";
import { FormPageHeader } from "@/components/form-page-header";
import { FormSection } from "@/components/form-section";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { NewSedeForm } from "./new-sede-form";

export default function NewSedePage() {
  return (
    <>
      <PageBreadcrumb items={[{ label: "Nueva sede" }]} />
      <main className="p-6">
        <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border bg-card shadow-sm">
          <FormPageHeader
            icon={Building2Icon}
            title="Nueva sede"
            description="Registra una nueva sede institucional."
          />
          <div className="p-6">
            <FormSection icon={MapPinIcon} title="Datos de la sede" color="var(--color-good)">
              <NewSedeForm />
            </FormSection>
          </div>
        </div>
      </main>
    </>
  );
}
