import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { codigoBarrasSvg } from "@/lib/activos/codigo-barras";
import { EtiquetasImpresion } from "../../etiquetas/etiquetas-impresion";

// Fase 67: etiqueta de un solo activo — la misma vista de impresión que el
// lote (/activos/etiquetas), con una sola etiqueta y sin selección.
export default async function EtiquetaActivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activo = await prisma.activo.findUnique({
    where: { id },
    select: { id: true, nombreActivo: true, codigoPatrimonial: true, sede: { select: { name: true } } },
  });
  if (!activo) notFound();

  return (
    <>
      <PageBreadcrumb
        items={[{ label: activo.nombreActivo, href: `/activos/${activo.id}` }, { label: "Etiqueta" }]}
      />
      <main className="space-y-6 p-4 sm:p-6 print:p-0">
        <div className="space-y-1 print:hidden">
          <h1 className="text-xl font-medium">Etiqueta del activo</h1>
          <p className="text-sm text-muted-foreground">
            Imprímela y pégala en el bien. Al escanearla se abre su ficha técnica.
          </p>
        </div>
        <EtiquetasImpresion
          activos={[
            {
              id: activo.id,
              nombreActivo: activo.nombreActivo,
              codigoPatrimonial: activo.codigoPatrimonial,
              sede: activo.sede?.name ?? null,
              codigoBarrasSvg: codigoBarrasSvg(activo.codigoPatrimonial),
            },
          ]}
          seleccionable={false}
        />
      </main>
    </>
  );
}
