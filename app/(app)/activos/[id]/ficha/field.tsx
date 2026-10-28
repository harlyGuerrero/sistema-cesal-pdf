import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Fase 26 de Activos: bloques de presentación de la ficha técnica —
// tarjeta con banda de color + ícono por sección (mismo lenguaje visual que
// FormSection en los formularios) y líneas punteadas entre campos. Puramente
// de layout, sin lógica de negocio (esa vive en page.tsx). El color es
// decorativo/de identidad entre secciones, no codifica datos.
// Grilla de campos: 1 columna en celular, 2 desde sm y al imprimir. Cada
// Field lleva una línea punteada debajo y la última no (last:). Con 2
// columnas la última fila puede tener dos campos: el penúltimo también queda
// sin línea cuando arranca esa fila (posición impar), para que la última
// fila se vea igual sin importar si tiene uno o dos campos. Supone que solo
// el último campo puede ocupar las dos columnas (span2), como "Descripción".
const ULTIMA_FILA_SIN_LINEA =
  "sm:[&>*:nth-last-child(2):nth-child(odd)]:border-b-0 sm:[&>*:nth-last-child(2):nth-child(odd)]:pb-0 " +
  "print:[&>*:nth-last-child(2):nth-child(odd)]:border-b-0 print:[&>*:nth-last-child(2):nth-child(odd)]:pb-0";
const CAMPOS_EN_DOS_COLUMNAS = `grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2 ${ULTIMA_FILA_SIN_LINEA}`;

export function Section({
  title,
  icon: Icon,
  color,
  children,
  bodyClassName,
}: {
  title: string;
  icon: LucideIcon;
  color: string;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section
      className="overflow-hidden rounded-xl border break-inside-avoid bg-card"
      style={{ borderColor: `color-mix(in oklch, ${color} 25%, var(--border))` }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ backgroundColor: `color-mix(in oklch, ${color} 8%, transparent)` }}
      >
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
        >
          <Icon className="size-3.5" />
        </span>
        <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color }}>
          {title}
        </h2>
      </div>
      <div className={cn("p-4", bodyClassName ?? CAMPOS_EN_DOS_COLUMNAS)}>
        {children}
      </div>
    </section>
  );
}

export function Field({
  label,
  value,
  span2 = false,
}: {
  label: string;
  value: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div className={cn("space-y-0.5 border-b border-dashed pb-2 last:border-b-0 last:pb-0", span2 && "sm:col-span-2 print:col-span-2")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? <span className="font-normal text-muted-foreground">—</span>}</p>
    </div>
  );
}
