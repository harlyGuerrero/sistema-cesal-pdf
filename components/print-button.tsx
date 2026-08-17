"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Fase 7 de Activos: exportar a PDF vía impresión del navegador, sin
// dependencia nueva. Reusado desde Fase 12 por /reportes (ver
// planificación de Activos, Fase 7 y Fase 12).
export function PrintButton({ className }: { className?: string }) {
  return (
    <Button type="button" variant="outline" className={cn(className)} onClick={() => window.print()}>
      <PrinterIcon />
      Imprimir / Exportar a PDF
    </Button>
  );
}
