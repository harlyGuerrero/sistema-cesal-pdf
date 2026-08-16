import { PackageIcon } from "lucide-react";
import { FormPageHeader } from "@/components/form-page-header";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { ActivoForm } from "../activo-form";
import { getActivoFormData } from "../form-data";

export default async function NewActivoPage() {
  const { tiposActivo, sedes } = await getActivoFormData();

  return (
    <>
      <PageBreadcrumb items={[{ label: "Nuevo activo" }]} />
      <main className="p-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-sm">
          <FormPageHeader
            icon={PackageIcon}
            title="Nuevo activo"
            description="Complete la información para registrar un nuevo activo en el sistema."
          />
          <ActivoForm tiposActivo={tiposActivo} sedes={sedes} />
        </div>
      </main>
    </>
  );
}
