"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DownloadIcon, EyeIcon, FileTextIcon, ImageIcon, TrashIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentoPreviewDialog } from "@/components/documento-preview-dialog";
import { TIPO_DOCUMENTO_LABELS } from "@/lib/activos/labels";
import { eliminarDocumentoAction } from "./documento-actions";
import { DocumentoUploadDialog } from "./documento-upload-dialog";

export interface DocumentoRow {
  id: string;
  tipoDocumento: string;
  nombreOriginal: string;
  mimeType: string;
  descripcion: string | null;
  createdAt: Date;
}

// Fase 10 de Activos: gestión de documentos (subir + eliminar) en la página
// de edición del activo. La ficha (solo lectura) usa un listado aparte, ver
// ficha/documentos-section.tsx.
export function DocumentoList({ activoId, documentos }: { activoId: string; documentos: DocumentoRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [vistaPrevia, setVistaPrevia] = useState<DocumentoRow | null>(null);

  function handleDelete(documentoId: string) {
    startTransition(async () => {
      try {
        await eliminarDocumentoAction(documentoId);
        toast.success("Documento eliminado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {documentos.map((documento) => (
          <li key={documento.id} className="flex min-w-0 items-center gap-3 rounded-md border px-3 py-2 text-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {documento.mimeType.startsWith("image/") ? (
                <ImageIcon className="size-4" />
              ) : (
                <FileTextIcon className="size-4" />
              )}
            </span>
            {/* min-w-0: sin esto un nombre de archivo largo empuja las acciones fuera de la fila. */}
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setVistaPrevia(documento)}
                className="block w-full truncate text-left font-medium hover:underline"
                title={`Vista previa de ${documento.nombreOriginal}`}
              >
                {documento.nombreOriginal}
              </button>
              <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="shrink-0">
                  {TIPO_DOCUMENTO_LABELS[documento.tipoDocumento] ?? documento.tipoDocumento}
                </Badge>
                {documento.descripcion && (
                  <span className="truncate" title={documento.descripcion}>
                    {documento.descripcion}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setVistaPrevia(documento)}
                aria-label={`Vista previa de ${documento.nombreOriginal}`}
              >
                <EyeIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                render={<a href={`/api/documentos/${documento.id}`} />}
                nativeButton={false}
                aria-label={`Descargar ${documento.nombreOriginal}`}
              >
                <DownloadIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => handleDelete(documento.id)}
                aria-label={`Eliminar ${documento.nombreOriginal}`}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
        {documentos.length === 0 && <p className="text-sm text-muted-foreground">Sin documentos todavía.</p>}
      </ul>
      <DocumentoUploadDialog activoId={activoId} />
      <DocumentoPreviewDialog
        open={vistaPrevia !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setVistaPrevia(null);
        }}
        src={vistaPrevia ? `/api/documentos/${vistaPrevia.id}?vista=1` : null}
        mimeType={vistaPrevia?.mimeType ?? ""}
        nombre={vistaPrevia?.nombreOriginal ?? ""}
        downloadHref={vistaPrevia ? `/api/documentos/${vistaPrevia.id}` : undefined}
      />
    </div>
  );
}
