import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ActivoForm, type ActivoFormInitial } from "../activo-form";
import { getActivoFormData } from "../form-data";
import { DeleteActivoButton } from "./delete-activo-button";
import { ResponsableSection } from "./responsable-section";

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
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">{activo.nombreActivo}</h1>
        <div className="flex items-center gap-4">
          <Link href={`/activos/${activo.id}/ficha`} className="text-sm text-muted-foreground hover:underline">
            Ver ficha técnica →
          </Link>
          <Link href="/activos" className="text-sm text-muted-foreground hover:underline">
            ← Volver a activos
          </Link>
        </div>
      </div>

      <section className="space-y-3 border-t pt-4">
        <h2 className="text-sm font-medium text-muted-foreground">Responsable</h2>
        <ResponsableSection
          activoId={activo.id}
          responsableActualId={activo.responsableActualId}
          responsables={responsables}
        />
      </section>

      <ActivoForm activoId={activo.id} initial={initial} tiposActivo={tiposActivo} sedes={sedes} />

      <section className="border-t pt-4">
        <DeleteActivoButton activoId={activo.id} hasHistory={activo.importItemId !== null} />
      </section>
    </main>
  );
}
