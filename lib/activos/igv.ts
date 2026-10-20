import type { IgvTratamiento } from "@/lib/generated/prisma/client";

// Fase 57: tasa general del IGV en Perú (16% IGV + 2% IPM). Una factura
// exonerada (ej. compras en la Amazonía) no lleva IGV: eso se marca por
// factura en Import.igvTratamiento, no con otra tasa.
export const IGV_TASA = 0.18;

export const IGV_TRATAMIENTO_OPTIONS = [
  { value: "SIN_IGV", label: "Precios sin IGV" },
  { value: "CON_IGV", label: "Precios con IGV incluido" },
  { value: "EXONERADO", label: "Exonerada de IGV" },
] as const satisfies readonly { value: IgvTratamiento; label: string }[];

export const IGV_TRATAMIENTO_LABELS: Record<IgvTratamiento, string> = Object.fromEntries(
  IGV_TRATAMIENTO_OPTIONS.map((option) => [option.value, option.label])
) as Record<IgvTratamiento, string>;

function redondear(value: number): number {
  return Math.round(value * 100) / 100;
}

// Precio unitario sin y con IGV a partir del precio extraído de la factura.
// Sin tratamiento definido no se adivina: solo se conoce el precio tal como
// vino, y el otro valor queda en null.
export function preciosConIgv(
  precioUnitario: number,
  tratamiento: IgvTratamiento | null
): { sinIgv: number | null; conIgv: number | null } {
  switch (tratamiento) {
    case "SIN_IGV":
      return { sinIgv: precioUnitario, conIgv: redondear(precioUnitario * (1 + IGV_TASA)) };
    case "CON_IGV":
      return { sinIgv: redondear(precioUnitario / (1 + IGV_TASA)), conIgv: precioUnitario };
    case "EXONERADO":
      return { sinIgv: precioUnitario, conIgv: precioUnitario };
    default:
      return { sinIgv: null, conIgv: null };
  }
}

// Símbolo de moneda para montos de factura. ImportItem.currency viene del
// extractor como código ISO (PEN/USD/EUR) o null; null se asume soles, la
// moneda de casi todas las compras de CESAL.
export function formatMonto(value: number | null, currency: string | null = null): string | null {
  if (value === null) return null;
  const simbolo = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "S/";
  return `${simbolo} ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
