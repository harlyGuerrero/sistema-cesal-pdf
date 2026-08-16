import { DownloadIcon } from "lucide-react";
import { TIPO_DOCUMENTO_LABELS } from "@/lib/activos/labels";

export interface DocumentoRow {
  id: string;
  tipoDocumento: string;
  nombreOriginal: string;
}

// Fase 10 de Activos: la ficha solo lista y permite descargar — subir y
// eliminar vive en la página de edición (ver ../documento-list.tsx).
// print:hidden en toda la sección: un link de descarga no tiene sentido en
// papel.
export function DocumentosSection({ documentos }: { documentos: DocumentoRow[] }) {
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
          <li key={documento.id} className="flex items-center gap-2 text-sm">
            <a
              href={`/api/documentos/${documento.id}`}
              className="flex items-center gap-1.5 hover:underline"
            >
              <DownloadIcon className="size-3.5 text-muted-foreground" />
              {documento.nombreOriginal}
            </a>
            <span className="text-xs text-muted-foreground">
              ({TIPO_DOCUMENTO_LABELS[documento.tipoDocumento] ?? documento.tipoDocumento})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
