import Link from "next/link";
import { notFound } from "next/navigation";
import { FileTextIcon, PackageIcon, UserIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { FormPageHeader } from "@/components/form-page-header";
import { FormSection } from "@/components/form-section";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { ActivoForm, type ActivoFormInitial } from "../activo-form";
import { getActivoFormData } from "../form-data";
import { DeleteActivoButton } from "./delete-activo-button";
import { ResponsableSection } from "./responsable-section";
import { DocumentoList } from "./documento-list";

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function toDecimalInputValue(value: { toString(): string } | null): string {
  return value ? value.toString() : "";
}

export default async function ActivoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [activo, { tiposActivo, sedes }, responsables] = await Promise.all([
    prisma.activo.findUnique({
      where: { id },
      include: {
        proveedor: true,
        importItem: true,
        especificaciones: { include: { campo: true, valorCatalogoValor: true } },
        documentos: { where: { estado: true }, orderBy: { createdAt: "desc" } },
        _count: { select: { documentos: true } },
      },
    }),
    getActivoFormData(),
    prisma.responsable.findMany({ where: { estado: true }, orderBy: { nombre: "asc" } }),
  ]);

  if (!activo) {
    notFound();
  }

  const especificaciones: Record<string, string> = {};
  for (const valor of activo.especificaciones) {
    switch (valor.campo.tipoDato) {
      case "TEXTO":
      case "URL":
        especificaciones[valor.campoId] = valor.valorTexto ?? "";
        break;
      case "NUMERO_ENTERO":
      case "NUMERO_DECIMAL":
        especificaciones[valor.campoId] = valor.valorNumero?.toString() ?? "";
        break;
      case "FECHA":
        especificaciones[valor.campoId] = toDateInputValue(valor.valorFecha);
        break;
      case "BOOLEANO":
        especificaciones[valor.campoId] = valor.valorBooleano ? "true" : "";
        break;
      case "SELECCION":
      case "CATALOGO":
        especificaciones[valor.campoId] = valor.valorCatalogoValorId ?? "";
        break;
    }
  }

  const initial: ActivoFormInitial = {
    nombreActivo: activo.nombreActivo,
    descripcion: activo.descripcion ?? "",
    subcategoriaId: activo.subcategoriaId ?? "",
    codigoPatrimonial: activo.codigoPatrimonial ?? "",
    sedeId: activo.sedeId ?? "",
    unidadOperativaId: activo.unidadOperativaId ?? "",
    ambienteId: activo.ambienteId ?? "",
    proveedorRazonSocial: activo.proveedor?.razonSocial ?? "",
    fechaAdquisicion: toDateInputValue(activo.fechaAdquisicion),
    numeroFactura: activo.numeroFactura ?? "",
    codigoProyecto: activo.codigoProyecto ?? "",
    costoAdquisicion: toDecimalInputValue(activo.costoAdquisicion),
    valorContable: toDecimalInputValue(activo.valorContable),
    valorActual: toDecimalInputValue(activo.valorActual),
    estadoPatrimonial: activo.estadoPatrimonial,
    condicionFisica: activo.condicionFisica ?? "",
    observaciones: activo.observaciones ?? "",
    especificaciones,
  };

  return (
    <>
      <PageBreadcrumb items={[{ label: activo.nombreActivo }]} />
      <main className="p-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-sm">
          <FormPageHeader
            icon={PackageIcon}
            title={activo.nombreActivo}
            description={`Código patrimonial: ${activo.codigoPatrimonial}`}
            actions={
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/activos/${activo.id}/ficha`} />}
                nativeButton={false}
              >
                <FileTextIcon />
                Ver ficha técnica
              </Button>
            }
          />

          <div className="space-y-5 p-6 pb-0">
            <FormSection icon={UserIcon} title="Responsable" color="var(--color-chart-2)">
              <ResponsableSection
                activoId={activo.id}
                responsableActualId={activo.responsableActualId}
                responsables={responsables}
              />
            </FormSection>

            <FormSection icon={FileTextIcon} title={`Documentos (${activo.documentos.length})`} color="var(--color-chart-3)">
              <DocumentoList activoId={activo.id} documentos={activo.documentos} />
            </FormSection>
          </div>

          <ActivoForm activoId={activo.id} initial={initial} tiposActivo={tiposActivo} sedes={sedes} />

          <div className="border-t p-6">
            <DeleteActivoButton
              activoId={activo.id}
              hasHistory={activo.importItemId !== null || activo._count.documentos > 0}
            />
          </div>
        </div>
      </main>
    </>
  );
}
