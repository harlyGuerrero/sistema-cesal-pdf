import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  CONDICION_FISICA_LABELS,
  ESTADO_PATRIMONIAL_LABELS,
} from "@/lib/activos/labels";
import { PrintButton } from "@/components/print-button";
import { Section, Field } from "./field";
import { HistorialSection } from "./historial-section";
import { DocumentosSection } from "./documentos-section";

function formatMoney(value: { toString(): string } | null): string | null {
  if (!value) return null;
  return `S/ ${Number(value.toString()).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
}

function formatDate(date: Date | null): string | null {
  return date ? date.toLocaleDateString("es-PE") : null;
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

  if (!activo) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 print:max-w-none print:space-y-4 print:p-8">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/activos/${activo.id}`} className="text-sm text-muted-foreground hover:underline">
          ← Volver al activo
        </Link>
        <PrintButton />
      </div>

      <header className="space-y-1 border-b pb-4">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Ficha técnica</p>
        <h1 className="text-2xl font-semibold">{activo.nombreActivo}</h1>
        <p className="text-sm text-muted-foreground">
          {activo.tipoActivo.name}
          {activo.subcategoria && ` · ${activo.subcategoria.categoria.nombre} › ${activo.subcategoria.nombre}`}
        </p>
      </header>

      <Section title="Identificación">
        <Field label="Código patrimonial" value={activo.codigoPatrimonial} />
        <Field label="Estado patrimonial" value={ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial]} />
        <Field
          label="Condición física"
          value={activo.condicionFisica ? CONDICION_FISICA_LABELS[activo.condicionFisica] : null}
        />
        <Field label="Responsable actual" value={activo.responsableActual?.nombre} />
        <Field label="Descripción" value={activo.descripcion} span2 />
      </Section>

      <Section title="Ubicación">
        <Field label="Sede" value={activo.sede?.name} />
        <Field label="Unidad operativa" value={activo.unidadOperativa?.name} />
        <Field label="Ambiente" value={activo.ambiente?.name} />
      </Section>

      <Section title="Adquisición">
        <Field label="Fecha de adquisición" value={formatDate(activo.fechaAdquisicion)} />
        <Field label="Proveedor" value={activo.proveedor?.razonSocial} />
        <Field label="N° de factura" value={activo.numeroFactura} />
        <Field label="Código de proyecto" value={activo.codigoProyecto} />
        <Field label="Costo de adquisición" value={formatMoney(activo.costoAdquisicion)} />
        <Field label="Valor contable" value={formatMoney(activo.valorContable)} />
        <Field label="Valor actual" value={formatMoney(activo.valorActual)} />
      </Section>

      {activo.especificaciones.length > 0 && (
        <Section title={`Especificaciones de ${activo.subcategoria?.nombre ?? ""}`}>
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

      <DocumentosSection documentos={activo.documentos} />

      <HistorialSection movimientos={activo.movimientos} />

      <footer className="border-t pt-3 text-xs text-muted-foreground">
        Generado el {new Date().toLocaleDateString("es-PE")} — CESAL, sistema de gestión patrimonial.
      </footer>
    </main>
  );
}
