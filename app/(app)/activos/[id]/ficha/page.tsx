import { notFound } from "next/navigation";
import {
  IdCardIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  TrendingDownIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import {
  CONDICION_FISICA_LABELS,
  ESTADO_PATRIMONIAL_LABELS,
} from "@/lib/activos/labels";
import { PrintButton } from "@/components/print-button";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { nombreCompleto } from "@/lib/nombre-completo";
import { preciosConIgv } from "@/lib/activos/igv";
import { formatFecha, formatSoles } from "@/lib/depreciacion/calculo";
import { Section, Field } from "./field";
import { HistorialSection } from "./historial-section";
import { DocumentosSection } from "./documentos-section";
import { DepreciacionActivoContent } from "../depreciacion-section";
import { cargarDepreciacionActivo } from "@/lib/depreciacion/detalle";

function formatMoney(value: { toString(): string } | null): string | null {
  if (!value) return null;
  return formatMontoFicha(Number(value.toString()));
}

// Fechas guardadas sin hora (fecha de adquisición, campos de fecha): se
// muestran tal cual se guardaron, en UTC. Convertirlas a la hora de Lima las
// retrasaba un día ("10/6/2026" para una compra del 11/06/2026).
function formatDate(date: Date | null): string | null {
  return date ? formatFecha(date) : null;
}

// Mismo formato de montos en toda la ficha ("S/ 250,00"), igual que la
// sección Depreciación; respeta la moneda de la factura cuando no es soles.
function formatMontoFicha(valor: number | null, moneda: string | null = null): string | null {
  if (valor === null) return null;
  const simbolo = moneda === "USD" ? "US$" : moneda === "EUR" ? "€" : "S/";
  return formatSoles(Math.round(valor * 100)).replace("S/", simbolo);
}

function formatEspecificacionValor(valor: {
  campo: { tipoDato: string; unidad: string | null };
  valorTexto: string | null;
  valorNumero: { toString(): string } | null;
  valorFecha: Date | null;
  valorBooleano: boolean | null;
  valorCatalogoValor: { valor: string } | null;
}): string | null {
  switch (valor.campo.tipoDato) {
    case "TEXTO":
    case "URL":
      return valor.valorTexto;
    case "NUMERO_ENTERO":
    case "NUMERO_DECIMAL":
      if (valor.valorNumero === null) return null;
      return valor.campo.unidad ? `${valor.valorNumero.toString()} ${valor.campo.unidad}` : valor.valorNumero.toString();
    case "FECHA":
      return formatDate(valor.valorFecha);
    case "BOOLEANO":
      return valor.valorBooleano === null ? null : valor.valorBooleano ? "Sí" : "No";
    case "SELECCION":
    case "CATALOGO":
      return valor.valorCatalogoValor?.valor ?? null;
    default:
      return null;
  }
}

// Fase 7 de Activos: ficha técnica de solo lectura, exportable a PDF vía
// impresión del navegador (ver print-button.tsx). Historial de movimientos
// (Fase 9, ver historial-section.tsx) y documentos (Fase 10, ver
// documentos-section.tsx) completan la ficha.
export default async function FichaActivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const depreciacionPromise = cargarDepreciacionActivo(prisma, id);
  const activo = await prisma.activo.findUnique({
    where: { id },
    include: {
      tipoActivo: true,
      subcategoria: { include: { categoria: true } },
      sede: true,
      unidadOperativa: true,
      ambiente: true,
      proveedor: true,
      responsableActual: true,
      importItem: {
        select: {
          unitPrice: true,
          currency: true,
          import: { select: { totalFactura: true, igvTratamiento: true } },
        },
      },
      especificaciones: {
        orderBy: [{ campo: { orden: "asc" } }, { campo: { nombre: "asc" } }],
        include: { campo: true, valorCatalogoValor: true },
      },
      movimientos: {
        orderBy: { fecha: "desc" },
        include: {
          usuario: true,
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
      documentos: { where: { estado: true }, orderBy: { createdAt: "desc" } },
    },
  });

  const depreciacion = await depreciacionPromise;
  if (!activo || !depreciacion) {
    notFound();
  }

  // Fase 57: precios de la factura de origen. Solo existen para activos que
  // nacieron de una importación; uno creado a mano solo tiene su costo.
  const factura = activo.importItem;
  const moneda = factura?.currency ?? null;
  const precioFactura = factura?.unitPrice != null ? Number(factura.unitPrice) : null;
  const igvTratamiento = factura?.import.igvTratamiento ?? null;
  const precios = precioFactura !== null ? preciosConIgv(precioFactura, igvTratamiento) : null;
  const totalFactura = factura?.import.totalFactura != null ? Number(factura.import.totalFactura) : null;
  const igvSinDefinir = precioFactura !== null && igvTratamiento === null;

  return (
    <>
      <PageBreadcrumb
        items={[
          { label: activo.nombreActivo, href: `/activos/${activo.id}` },
          { label: "Ficha técnica" },
        ]}
      />
      <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 print:max-w-none print:space-y-4 print:p-8">
      <header className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Ficha técnica</p>
          <h1 className="text-xl font-bold break-words sm:text-2xl">{activo.nombreActivo}</h1>
          <p className="text-sm text-muted-foreground">
            {activo.tipoActivo.name}
            {activo.subcategoria && ` · ${activo.subcategoria.categoria.nombre} › ${activo.subcategoria.nombre}`}
          </p>
        </div>
        <div className="shrink-0 print:hidden">
          <PrintButton className="w-full sm:w-auto" />
        </div>
      </header>

      <Section title="Identificación" icon={IdCardIcon} color="var(--primary)">
        <Field label="Código patrimonial" value={activo.codigoPatrimonial} />
        <Field label="Estado patrimonial" value={ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial]} />
        <Field
          label="Condición física"
          value={activo.condicionFisica ? CONDICION_FISICA_LABELS[activo.condicionFisica] : null}
        />
        <Field label="Responsable actual" value={activo.responsableActual ? nombreCompleto(activo.responsableActual) : null} />
        <Field label="Descripción" value={activo.descripcion} span2 />
      </Section>

      <Section title="Ubicación" icon={MapPinIcon} color="var(--color-good)">
        <Field label="Sede" value={activo.sede?.name} />
        <Field label="Unidad operativa" value={activo.unidadOperativa?.name} />
        <Field label="Ambiente" value={activo.ambiente?.name} />
      </Section>

      <Section title="Adquisición" icon={ShoppingCartIcon} color="var(--color-chart-2)">
        <Field label="Fecha de adquisición" value={formatDate(activo.fechaAdquisicion)} />
        <Field label="Proveedor" value={activo.proveedor?.razonSocial} />
        <Field label="N° de factura" value={activo.numeroFactura} />
        <Field label="Total de la factura" value={formatMontoFicha(totalFactura, moneda)} />
        <Field
          label="Precio unitario (sin IGV)"
          value={
            igvSinDefinir ? (
              <>
                {formatMontoFicha(precioFactura, moneda)}{" "}
                <span className="font-normal text-muted-foreground">(IGV sin definir)</span>
              </>
            ) : (
              formatMontoFicha(precios?.sinIgv ?? null, moneda)
            )
          }
        />
        <Field
          label="Precio unitario con IGV"
          value={
            igvSinDefinir ? (
              <span className="font-normal text-muted-foreground">Definir el IGV en la importación</span>
            ) : igvTratamiento === "EXONERADO" ? (
              <>
                {formatMontoFicha(precios?.conIgv ?? null, moneda)}{" "}
                <span className="font-normal text-muted-foreground">(exonerada)</span>
              </>
            ) : (
              formatMontoFicha(precios?.conIgv ?? null, moneda)
            )
          }
        />
        <Field label="Código de proyecto" value={activo.codigoProyecto} />
        <Field label="Costo de adquisición" value={formatMoney(activo.costoAdquisicion)} />
        <Field label="Valor contable" value={formatMoney(activo.valorContable)} />
        <Field label="Valor actual" value={formatMoney(activo.valorActual)} />
      </Section>

      {activo.especificaciones.length > 0 && (
        <Section
          title={`Especificaciones de ${activo.subcategoria?.nombre ?? ""}`}
          icon={SlidersHorizontalIcon}
          color="var(--color-chart-4)"
        >
          {activo.especificaciones.map((valor) => (
            <Field key={valor.id} label={valor.campo.etiqueta} value={formatEspecificacionValor(valor)} />
          ))}
        </Section>
      )}

      {activo.observaciones && (
        <section className="space-y-2 break-inside-avoid">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Observaciones
          </h2>
          <p className="text-sm whitespace-pre-wrap">{activo.observaciones}</p>
        </section>
      )}

      <Section title="Depreciación" icon={TrendingDownIcon} color="var(--color-chart-3)" bodyClassName="p-4">
        <DepreciacionActivoContent data={depreciacion} />
      </Section>

      <DocumentosSection documentos={activo.documentos} />

      <HistorialSection movimientos={activo.movimientos} />

      <footer className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheckIcon className="size-3" />
        </span>
        Generado el {new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" })} — CESAL, sistema de gestión patrimonial.
      </footer>
      </main>
    </>
  );
}
