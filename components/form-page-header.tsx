import type { LucideIcon } from "lucide-react";

// Fase 18: encabezado compartido de página-formulario (ícono + título +
// descripción + acciones) — mismo patrón visual para "Nuevo activo", la
// ficha de edición, y cualquier otro formulario que lo adopte después. El
// enlace de volver que vivía acá (Fase 18) se movió al breadcrumb del header
// del layout (Fase 24, ver PageBreadcrumb) — no lo dupliques acá.
export function FormPageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-4">{actions}</div>}
    </div>
  );
}
