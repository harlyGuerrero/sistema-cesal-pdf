"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { DownloadIcon, TrashIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIPO_DOCUMENTO_LABELS } from "@/lib/activos/labels";
import { eliminarDocumentoAction } from "./documento-actions";
import { DocumentoUploadDialog } from "./documento-upload-dialog";

export interface DocumentoRow {
  id: string;
  tipoDocumento: string;
  nombreOriginal: string;
  descripcion: string | null;
  createdAt: Date;
}

// Fase 10 de Activos: gestión de documentos (subir + eliminar) en la página
// de edición del activo. La ficha (solo lectura) usa un listado aparte, ver
// ficha/documentos-section.tsx.
export function DocumentoList({ activoId, documentos }: { activoId: string; documentos: DocumentoRow[] }) {
  const [isPending, startTransition] = useTransition();

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
          <li
            key={documento.id}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
          >
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Badge variant="outline">{TIPO_DOCUMENTO_LABELS[documento.tipoDocumento] ?? documento.tipoDocumento}</Badge>
              <span className="truncate">{documento.nombreOriginal}</span>
              {documento.descripcion && (
                <span className="text-xs text-muted-foreground">{documento.descripcion}</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
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
    </div>
  );
}
