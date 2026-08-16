import { Building2Icon, DoorOpenIcon, MapPinIcon, NetworkIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FormPageHeader } from "@/components/form-page-header";
import { FormSection } from "@/components/form-section";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { REGION_LABELS } from "@/lib/sedes/labels";
import { SedeEditForm } from "./sede-edit-form";
import { DeleteSedeButton } from "./delete-sede-button";
import { UnidadOperativaSection } from "./unidad-operativa-section";
import { AmbienteSection } from "./ambiente-section";

export default async function SedeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sede = await prisma.sede.findUnique({
    where: { id },
    include: {
      unidadesOperativas: { orderBy: { name: "asc" } },
      ambientes: {
        orderBy: { name: "asc" },
        include: { unidadOperativa: { select: { id: true, name: true } } },
      },
      _count: { select: { unidadesOperativas: true, ambientes: true } },
    },
  });

  if (!sede) {
    notFound();
  }

  return (
    <>
      <PageBreadcrumb items={[{ label: "Sedes", href: "/sedes" }, { label: sede.name }]} />
      <main className="p-6">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-sm">
        <FormPageHeader
          icon={Building2Icon}
          title={sede.name}
          description={`Región: ${REGION_LABELS[sede.region] ?? sede.region}`}
        />

        <div className="space-y-5 p-6">
          <FormSection icon={MapPinIcon} title="Datos de la sede" color="var(--color-good)">
            <SedeEditForm sedeId={sede.id} name={sede.name} region={sede.region} />
          </FormSection>

          <FormSection
            icon={NetworkIcon}
            title={`Unidades operativas (${sede.unidadesOperativas.length})`}
            color="var(--color-chart-3)"
          >
            <UnidadOperativaSection sedeId={sede.id} unidades={sede.unidadesOperativas} />
          </FormSection>

          <FormSection icon={DoorOpenIcon} title={`Ambientes (${sede.ambientes.length})`} color="var(--color-chart-5)">
            <AmbienteSection
              sedeId={sede.id}
              ambientes={sede.ambientes}
              unidadesOperativas={sede.unidadesOperativas}
            />
          </FormSection>
        </div>

        <div className="border-t p-6">
          <DeleteSedeButton
            sedeId={sede.id}
            hasChildren={sede._count.unidadesOperativas > 0 || sede._count.ambientes > 0}
          />
        </div>
      </div>
      </main>
    </>
  );
}
