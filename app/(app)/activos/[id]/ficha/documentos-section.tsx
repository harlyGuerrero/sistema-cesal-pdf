"use client";

import { useState } from "react";
import { DownloadIcon, EyeIcon } from "lucide-react";
import { DocumentoPreviewDialog } from "@/components/documento-preview-dialog";
import { TIPO_DOCUMENTO_LABELS } from "@/lib/activos/labels";

export interface DocumentoRow {
  id: string;
  tipoDocumento: string;
  nombreOriginal: string;
  mimeType: string;
}

// Fase 10 de Activos: la ficha solo lista y permite descargar — subir y
// eliminar vive en la página de edición (ver ../documento-list.tsx).
// print:hidden en toda la sección: un link de descarga no tiene sentido en
// papel. Fase 63: además de descargar, cada documento se puede previsualizar.
export function DocumentosSection({ documentos }: { documentos: DocumentoRow[] }) {
  const [vistaPrevia, setVistaPrevia] = useState<DocumentoRow | null>(null);

  if (documentos.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2 break-inside-avoid print:hidden">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Documentos ({documentos.length})
      </h2>
      <ul className="space-y-1">
        {documentos.map((documento) => (
          <li key={documento.id} className="flex min-w-0 items-center gap-2 text-sm">
            <a
              href={`/api/documentos/${documento.id}`}
              className="flex min-w-0 items-center gap-1.5 hover:underline"
              title={documento.nombreOriginal}
            >
              <DownloadIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{documento.nombreOriginal}</span>
            </a>
            <span className="shrink-0 text-xs text-muted-foreground">
              ({TIPO_DOCUMENTO_LABELS[documento.tipoDocumento] ?? documento.tipoDocumento})
            </span>
            <button
              type="button"
              onClick={() => setVistaPrevia(documento)}
              className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline print:hidden"
            >
              <EyeIcon className="size-3.5" />
              Vista previa
            </button>
          </li>
        ))}
      </ul>
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
    </section>
  );
}
