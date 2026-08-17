import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Fase 26 de Activos: bloques de presentación de la ficha técnica —
// tarjeta con banda de color + ícono por sección (mismo lenguaje visual que
// FormSection en los formularios) y líneas punteadas entre campos. Puramente
// de layout, sin lógica de negocio (esa vive en page.tsx). El color es
// decorativo/de identidad entre secciones, no codifica datos.
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
      <div className={cn("p-4", bodyClassName ?? "grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2")}>
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
    <div className={cn("space-y-0.5 border-b border-dashed pb-2 last:border-b-0 last:pb-0", span2 && "col-span-2")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? <span className="font-normal text-muted-foreground">—</span>}</p>
    </div>
  );
}
