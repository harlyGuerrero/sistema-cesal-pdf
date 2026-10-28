"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CircleAlertIcon,
  FileTextIcon,
  Loader2Icon,
  RotateCwIcon,
  ScanTextIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DocumentoPreviewDialog } from "@/components/documento-preview-dialog";
import { cn } from "@/lib/utils";

interface UploadResponse {
  status: "processed" | "duplicate" | "failed";
  importId: string;
  itemCount?: number;
  error?: string;
}

// Mismo límite que valida el servidor (lib/security/pdf-validation.ts); acá
// solo sirve para avisar antes de subir — el servidor vuelve a validar todo,
// incluida la firma real del PDF.
const MAX_BYTES = 20 * 1024 * 1024;

type Fase = "elegir" | "listo" | "subiendo" | "procesando" | "error";

function formatTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFecha(ms: number): string {
  return new Date(ms).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function validarEnCliente(file: File): string | null {
  const esPdf = file.name.toLowerCase().endsWith(".pdf") && (file.type === "" || file.type === "application/pdf");
  if (!esPdf) return "Solo se aceptan facturas en PDF.";
  if (file.size > MAX_BYTES) return "El PDF supera el máximo de 20 MB.";
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

// Fase 64: diálogo de importación con el mismo lenguaje visual que la subida
// de documentos del activo (zona para arrastrar y soltar, tarjeta del
// archivo). Sube con XMLHttpRequest para mostrar el progreso real de la
// subida; después el servidor procesa el PDF (Docling, clasificación) sin
// informar avance, así que esa fase se muestra como "en curso", sin un
// porcentaje inventado. Mientras sube o procesa el diálogo no se puede
// cerrar: cortar la petición dejaría la importación a medias.
export function UploadImportDialog() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fase, setFase] = useState<Fase>("elegir");
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  const ocupado = fase === "subiendo" || fase === "procesando";

  function elegir(lista: FileList | null) {
    const elegido = lista?.[0];
    if (!elegido) return;
    if (lista.length > 1) toast.info("Se importa una factura a la vez: se tomó el primer archivo.");
    const problema = validarEnCliente(elegido);
    setFile(elegido);
    setError(problema);
    setFase(problema ? "error" : "listo");
  }

  function reiniciar() {
    setFile(null);
    setError(null);
    setProgreso(0);
    setFase("elegir");
  }

  function finalizar(importId: string) {
    setOpen(false);
    reiniciar();
    router.push(`/importaciones/${importId}`);
    router.refresh();
  }

  function importar() {
    if (!file) return;
    setError(null);
    setProgreso(0);
    setFase("subiendo");

    const formData = new FormData();
    formData.set("file", file);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgreso(Math.round((event.loaded / event.total) * 100));
    };
    // Terminó de enviar el archivo: lo que sigue es el procesamiento del PDF.
    xhr.upload.onload = () => setFase("procesando");
    xhr.onload = () => {
      // Sin sesión, proxy.ts redirige a /login y el XHR sigue el redirect.
      if (new URL(xhr.responseURL, window.location.href).pathname.startsWith("/login")) {
        setError("Tu sesión expiró. Vuelve a iniciar sesión.");
        setFase("error");
        return;
      }
      let result: Partial<UploadResponse> & { error?: string } = {};
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        // respuesta sin JSON: se usa el mensaje genérico de abajo
      }

      if (result.status === "duplicate" && result.importId) {
        toast.error("Este PDF ya fue importado antes. Te llevamos a esa importación.");
        finalizar(result.importId);
        return;
      }
      if (result.status === "failed" && result.importId) {
        toast.error("El procesamiento del PDF falló. Revisa el detalle de la importación.");
        finalizar(result.importId);
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && result.importId) {
        toast.success(`PDF procesado: ${result.itemCount ?? 0} candidatos detectados.`);
        finalizar(result.importId);
        return;
      }
      setError(result.error ?? "No se pudo importar el PDF.");
      setFase("error");
    };
    xhr.onerror = () => {
      setError("No se pudo conectar con el servidor.");
      setFase("error");
    };
    xhr.open("POST", "/api/imports");
    xhr.send(formData);
  }

  // Un error de validación local (no es PDF, muy grande) no se reintenta con
  // el mismo archivo: hay que elegir otro.
  const reintentable = file !== null && validarEnCliente(file) === null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);
          return;
        }
        if (ocupado) return;
        setOpen(false);
        reiniciar();
      }}
    >
      <DialogTrigger render={<Button />}>
        <UploadIcon />
        Importar PDF
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" showCloseButton={!ocupado}>
        <DialogHeader>
          <DialogTitle>Importar factura en PDF</DialogTitle>
          <DialogDescription>
            Se detecta la tabla de productos, se clasifican los ítems y se reconoce el N° de factura. Todo queda listo
            para revisión.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(event) => {
              event.preventDefault();
              setArrastrando(false);
              elegir(event.dataTransfer.files);
            }}
            className={cn(
              "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-9 text-center transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              arrastrando ? "border-primary bg-primary/5" : "border-input"
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadIcon className="size-4.5" />
            </span>
            <span className="text-sm font-medium">
              Arrastra la factura aquí o <span className="text-primary underline-offset-4 hover:underline">examina</span>
            </span>
            <span className="text-xs text-muted-foreground">Un PDF por vez · hasta 20 MB</span>
          </button>
        ) : (
          <div className="min-w-0 rounded-lg border p-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileTextIcon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                {reintentable ? (
                  <button
                    type="button"
                    onClick={() => setVistaPrevia(URL.createObjectURL(file))}
                    className="block w-full truncate text-left text-sm font-medium hover:underline"
                    title={`Vista previa de ${file.name}`}
                  >
                    {file.name}
                  </button>
                ) : (
                  <p className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatFecha(file.lastModified)} · {formatTamano(file.size)}
                </p>
                {fase === "listo" && <p className="mt-1 text-xs text-muted-foreground">Listo para importar</p>}
                {fase === "error" && error && (
                  <p className="mt-1 flex items-start gap-1 text-xs font-medium text-destructive">
                    <CircleAlertIcon className="mt-px size-3.5 shrink-0" />
                    {error}
                  </p>
                )}
              </div>
              {!ocupado && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={reiniciar}
                  aria-label={`Quitar ${file.name}`}
                >
                  <XIcon className="size-3.5" />
                </Button>
              )}
            </div>

            {fase === "subiendo" && (
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={progreso}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Subiendo la factura"
                >
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progreso}%` }} />
                </div>
                <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{progreso}%</span>
              </div>
            )}

            {fase === "procesando" && (
              <div className="mt-3 flex items-start gap-2.5 rounded-md bg-primary/5 px-3 py-2.5" role="status">
                <ScanTextIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 text-xs">
                  <p className="flex items-center gap-1.5 font-medium text-foreground">
                    Leyendo la factura
                    <Loader2Icon className="size-3 animate-spin text-primary" />
                  </p>
                  <p className="text-muted-foreground">
                    Detectando la tabla de productos y clasificando los ítems. Puede tardar unos segundos; no cierres
                    esta ventana.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            elegir(event.target.files);
            event.target.value = "";
          }}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={ocupado}
            onClick={() => {
              setOpen(false);
              reiniciar();
            }}
          >
            Cancelar
          </Button>
          {fase === "error" && reintentable ? (
            <Button type="button" onClick={importar}>
              <RotateCwIcon />
              Reintentar
            </Button>
          ) : (
            <Button type="button" onClick={importar} disabled={fase !== "listo"}>
              {ocupado ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
              {fase === "subiendo" ? "Subiendo..." : fase === "procesando" ? "Procesando..." : "Importar"}
            </Button>
          )}
        </DialogFooter>

        {/* Anidado: Base UI lo trata como diálogo hijo y no cierra el de importación. */}
        <DocumentoPreviewDialog
          open={vistaPrevia !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setVistaPrevia(null);
          }}
          src={vistaPrevia}
          mimeType="application/pdf"
          nombre={file?.name ?? ""}
        />
      </DialogContent>
    </Dialog>
  );
}
