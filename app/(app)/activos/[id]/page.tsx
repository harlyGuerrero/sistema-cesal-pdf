import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveXIcon, FileTextIcon, HistoryIcon, PackageIcon, TrendingDownIcon, UserIcon } from "lucide-react";
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
import { DepreciacionActivoContent } from "./depreciacion-section";
import { cargarDepreciacionActivo } from "@/lib/depreciacion/detalle";
import { agregarHistorial, formatPeriodo } from "@/lib/depreciacion/calculo";
import { MovimientosTabla } from "../../movimientos/movimientos-tabla";
import { DarDeBajaButton, ReactivarActivoButton } from "../baja-activo-dialogs";
import { getSessionUsuario } from "@/lib/auth/session";
import {
  aActivoEliminable,
  CONTEO_ELIMINACION,
  motivoNoEliminable,
  puedeEliminarActivos,
} from "@/lib/activos/eliminacion";
import { MOTIVO_BAJA_LABELS } from "@/lib/activos/labels";
import { formatFecha } from "@/lib/depreciacion/calculo";

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

  const [activo, { tiposActivo, sedes }, responsables, depreciacion, usuario] = await Promise.all([
    prisma.activo.findUnique({
      where: { id },
      include: {
        proveedor: true,
        importItem: true,
        especificaciones: { include: { campo: true, valorCatalogoValor: true } },
        documentos: { where: { estado: true }, orderBy: { createdAt: "desc" } },
        // Fase 59: historial de movimientos, del más reciente al más antiguo.
        movimientos: {
          orderBy: { fecha: "desc" },
          include: {
            activo: {
              select: {
                id: true,
                nombreActivo: true,
                codigoPatrimonial: true,
                sede: { select: { name: true } },
                unidadOperativa: { select: { name: true } },
                ambiente: { select: { name: true } },
              },
            },
            usuario: { select: { nombres: true, apellidos: true } },
            responsableAnterior: true,
            responsableNuevo: true,
            sedeAnterior: true,
            sedeNueva: true,
            unidadOperativaAnterior: true,
            unidadOperativaNueva: true,
            ambienteAnterior: true,
            ambienteNuevo: true,
          },
        },
        _count: { select: CONTEO_ELIMINACION },
      },
    }),
    getActivoFormData(),
    prisma.responsable.findMany({
      where: { estado: true },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
    cargarDepreciacionActivo(prisma, id),
    getSessionUsuario(),
  ]);

  if (!activo || !depreciacion) {
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

  const dadoDeBaja = activo.estadoPatrimonial === "BAJA";

  const initial: ActivoFormInitial = {
    nombreActivo: activo.nombreActivo,
    descripcion: activo.descripcion ?? "",
    tipoActivoId: activo.tipoActivoId,
    subcategoriaId: activo.subcategoriaId ?? "",
    codigoPatrimonial: activo.codigoPatrimonial ?? "",
    sedeId: activo.sedeId ?? "",
    unidadOperativaId: activo.unidadOperativaId ?? "",
    ambienteId: activo.ambienteId ?? "",
    proveedorRazonSocial: activo.proveedor?.razonSocial ?? "",
    fechaAdquisicion: toDateInputValue(activo.fechaAdquisicion),
    numeroFactura: activo.numeroFactura ?? "",
    numeroFC: activo.numeroFC ?? "",
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
      <main className="p-4 sm:p-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-sm">
          <FormPageHeader
            icon={PackageIcon}
            title={activo.nombreActivo}
            description={`Código patrimonial: ${activo.codigoPatrimonial}`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/activos/${activo.id}/ficha`} />}
                  nativeButton={false}
                >
                  <FileTextIcon />
                  Ver ficha técnica
                </Button>
                {/* Fase 66: la acción frecuente va arriba; eliminar queda al pie. */}
                {dadoDeBaja ? (
                  <ReactivarActivoButton activoId={activo.id} nombreActivo={activo.nombreActivo} />
                ) : (
                  <DarDeBajaButton activoId={activo.id} nombreActivo={activo.nombreActivo} />
                )}
              </div>
            }
          />

          {dadoDeBaja && (
            <div className="flex items-start gap-3 border-b bg-destructive/5 px-4 py-3 sm:px-6" role="status">
              <ArchiveXIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  Dado de baja
                  {activo.fechaBaja ? ` el ${formatFecha(activo.fechaBaja)}` : ""}
                  {" · "}
                  Motivo: {activo.motivoBaja ? MOTIVO_BAJA_LABELS[activo.motivoBaja] : "Sin registrar"}
                </p>
                {activo.observacionesBaja && (
                  <p className="wrap-break-word text-muted-foreground">{activo.observacionesBaja}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Los datos quedan de solo lectura. Para editarlo o asignarlo, reactívalo.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-5 p-4 sm:p-6 pb-0">
            <FormSection icon={UserIcon} title="Responsable" color="var(--color-chart-2)">
              {dadoDeBaja ? (
                <p className="text-sm text-muted-foreground">Un activo dado de baja no tiene responsable.</p>
              ) : (
                <ResponsableSection
                  activoId={activo.id}
                  responsableActualId={activo.responsableActualId}
                  responsables={responsables}
                />
              )}
            </FormSection>

            <FormSection icon={FileTextIcon} title={`Documentos (${activo.documentos.length})`} color="var(--color-chart-3)">
              <DocumentoList activoId={activo.id} documentos={activo.documentos} />
            </FormSection>

            <div id="historial" className="scroll-mt-20">
              <FormSection
                icon={HistoryIcon}
                title={`Historial de movimientos (${activo.movimientos.length})`}
                color="var(--color-chart-5)"
              >
                {activo.movimientos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este activo todavía no tiene movimientos registrados.
                  </p>
                ) : (
                  <div className="-mx-4 border-t sm:-mx-5">
                    <MovimientosTabla movimientos={activo.movimientos} mostrarActivo={false} />
                  </div>
                )}
              </FormSection>
            </div>

            {/* Fase 58: ancla #depreciacion — el botón "Ver" de /depreciacion llega acá. */}
            <div id="depreciacion" className="scroll-mt-20">
              <FormSection icon={TrendingDownIcon} title="Depreciación" color="var(--color-chart-3)">
                <DepreciacionActivoContent data={depreciacion} />
              </FormSection>
            </div>
          </div>

          <ActivoForm
            activoId={activo.id}
            initial={initial}
            tiposActivo={tiposActivo}
            sedes={sedes}
            esDeImportacion={activo.importItemId != null}
            documentosFirma={activo.documentos.map((documento) => documento.id).join(",")}
            soloLectura={dadoDeBaja}
            historialDepreciacion={agregarHistorial(depreciacion.historial)}
            ultimoPeriodoDepreciado={
              depreciacion.resumen.ultimoPeriodo ? formatPeriodo(depreciacion.resumen.ultimoPeriodo) : null
            }
          />

          {puedeEliminarActivos(usuario?.rol) && (
            <div className="border-t p-4 sm:p-6">
              <DeleteActivoButton
                activoId={activo.id}
                nombreActivo={activo.nombreActivo}
                motivoBloqueo={motivoNoEliminable(aActivoEliminable(activo))}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
