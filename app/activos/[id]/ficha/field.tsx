// Fase 7 de Activos: bloques de presentación de la ficha técnica —
// puramente de layout, sin lógica de negocio (esa vive en page.tsx).

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 break-inside-avoid">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border p-4 print:rounded-none print:border-0 print:p-0">
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
    <div className={span2 ? "col-span-2" : undefined}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}
