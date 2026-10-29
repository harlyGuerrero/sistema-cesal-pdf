import Link from "next/link";
import { PrinterIcon, ScanBarcodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Escaner } from "./escaner";

// Fase 67: escanear etiquetas para abrir la ficha técnica del activo y llevar
// la cuenta de un inventario.
export default function EscanearActivoPage() {
  return (
    <>
      <PageBreadcrumb items={[{ label: "Escanear" }]} />
      <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ScanBarcodeIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-medium">Escanear activos</h1>
              <p className="text-sm text-muted-foreground">Lee la etiqueta de un bien para ver su ficha técnica.</p>
            </div>
          </div>
          <Button variant="outline" render={<Link href="/activos/etiquetas" />} nativeButton={false}>
            <PrinterIcon />
            Imprimir etiquetas
          </Button>
        </div>
        <Escaner />
      </main>
    </>
  );
}
