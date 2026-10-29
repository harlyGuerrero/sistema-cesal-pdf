import Link from "next/link";
import { redirect } from "next/navigation";
import { ScanBarcodeIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { normalizarCodigoEscaneado } from "@/lib/activos/codigo-escaneado";

// Fase 67: destino de un escaneo. Recibe el código patrimonial leído de la
// etiqueta y lleva directo a la ficha técnica del activo; si no existe, lo
// dice y deja volver a escanear.
export default async function ActivoPorCodigoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: crudo } = await params;
  const codigo = normalizarCodigoEscaneado(crudo);

  const activo = codigo
    ? await prisma.activo.findUnique({ where: { codigoPatrimonial: codigo }, select: { id: true } })
    : null;
  if (activo) redirect(`/activos/${activo.id}/ficha`);

  return (
    <>
      <PageBreadcrumb items={[{ label: "Escanear", href: "/activos/escanear" }, { label: "No encontrado" }]} />
      <main className="p-4 sm:p-6">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ScanBarcodeIcon className="size-5" />
          </span>
          <h1 className="text-lg font-semibold">No hay un activo con ese código</h1>
          <p className="text-sm text-muted-foreground">
            Se leyó <span className="font-mono font-medium text-foreground break-all">{codigo || "(vacío)"}</span>.
            Revisa que la etiqueta no esté dañada o busca el activo en el listado.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button render={<Link href="/activos/escanear" />} nativeButton={false}>
              <ScanBarcodeIcon />
              Escanear otro
            </Button>
            <Button
              variant="outline"
              render={<Link href={`/activos?q=${encodeURIComponent(codigo)}`} />}
              nativeButton={false}
            >
              Buscar en activos
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
