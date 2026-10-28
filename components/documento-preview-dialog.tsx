"use client";

import { DownloadIcon, FileWarningIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Fase 63: vista previa de un documento (PDF o imagen) dentro de la página.
// `src` es la ruta inline del documento ya subido (/api/documentos/[id]?vista=1)
// o un object URL de un archivo local que todavía no se sube.
export function DocumentoPreviewDialog({
  open,
  onOpenChange,
  src,
  mimeType,
  nombre,
  downloadHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null;
  mimeType: string;
  nombre: string;
  downloadHref?: string;
}) {
  const esPdf = mimeType === "application/pdf";
  const esImagen = mimeType.startsWith("image/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-4xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="truncate">{nombre}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/40">
          {src && esPdf && <iframe src={src} title={nombre} className="h-[72vh] w-full" />}
          {src && esImagen && (
            // eslint-disable-next-line @next/next/no-img-element -- archivo del usuario servido por la API, no un asset estático optimizable
            <img src={src} alt={nombre} className="mx-auto max-h-[72vh] w-auto object-contain" />
          )}
          {src && !esPdf && !esImagen && (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FileWarningIcon className="size-6" />
              Este tipo de archivo no tiene vista previa.
            </div>
          )}
        </div>
        {downloadHref && (
          <div className="flex justify-end">
            <Button variant="outline" render={<a href={downloadHref} />} nativeButton={false}>
              <DownloadIcon />
              Descargar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
