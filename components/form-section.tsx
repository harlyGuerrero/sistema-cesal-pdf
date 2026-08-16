import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Fase 18: bloque de sección para formularios largos — ícono con tinte de
// color + título, agrupando sus campos en su propio borde. El color es
// puramente decorativo/de identidad visual entre secciones de un mismo
// formulario, no codifica datos (a diferencia de un chart, donde el color
// sí tiene que pasar por la skill dataviz) — por eso reusa tokens de tema
// existentes (primary/good/warning/chart-5/neutral) sin necesidad de
// validarlos con el script de esa skill.
export function FormSection({
  icon: Icon,
  title,
  color,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 rounded-xl border p-5", className)}>
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
        >
          <Icon className="size-4" />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}
