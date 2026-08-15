"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fase 7 de Activos: exportar a PDF vía impresión del navegador, sin
// dependencia nueva (ver planificación de Activos, Fase 7).
export function PrintButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      <PrinterIcon />
      Imprimir / Exportar a PDF
    </Button>
  );
}
