"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  RotateCwIcon,
  Trash2Icon,
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentoPreviewDialog } from "@/components/documento-preview-dialog";
import { TIPO_DOCUMENTO_LABELS, TIPO_DOCUMENTO_OPTIONS } from "@/lib/activos/labels";
import { cn } from "@/lib/utils";
import { eliminarDocumentoAction } from "./documento-actions";

// Mismos límites que valida el servidor (lib/security/document-validation.ts);
// acá solo sirven para avisar antes de subir — el servidor vuelve a validar
// todo, incluida la firma real del archivo.
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_ARCHIVOS = 20;
const SUBIDAS_EN_PARALELO = 3;
const EXTENSIONES = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const EXTENSIONES_IMAGEN = [".jpg", ".jpeg", ".png", ".webp"];
const MIME_POR_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type EstadoArchivo = "listo" | "subiendo" | "completado" | "error";

interface ArchivoEnCola {
  key: string;
  file: File;
  tipoDocumento: string;
  descripcion: string;
  estado: EstadoArchivo;
  progreso: number;
  error?: string;
  // false cuando el archivo nunca va a pasar (formato o tamaño): no se ofrece reintentar.
  reintentable: boolean;
  documentoId?: string;
}

function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto === -1 ? "" : nombre.slice(punto).toLowerCase();
}

function huella(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function formatTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFecha(ms: number): string {
  return new Date(ms).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function validarEnCliente(file: File): string | null {
  if (!EXTENSIONES.includes(extensionDe(file.name))) return "Formato no permitido. Usa PDF, JPG, PNG o WEBP.";
  if (file.size > MAX_BYTES) return "Supera el máximo de 20 MB.";
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

function pendiente(archivo: ArchivoEnCola): boolean {
  return archivo.estado === "listo" || (archivo.estado === "error" && archivo.reintentable);
}

// XMLHttpRequest (no fetch) porque es la única forma de leer el progreso de
// subida en el navegador.
function subirConProgreso(
  url: string,
  formData: FormData,
  onProgreso: (porcentaje: number) => void
): { promesa: Promise<{ id: string }>; cancelar: () => void } {
  const xhr = new XMLHttpRequest();
  const promesa = new Promise<{ id: string }>((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgreso(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      // Sin sesión, proxy.ts redirige a /login y el XHR sigue el redirect.
      if (new URL(xhr.responseURL, window.location.href).pathname.startsWith("/login")) {
        reject(new Error("Tu sesión expiró. Vuelve a iniciar sesión."));
        return;
      }
      let cuerpo: { id?: string; error?: string } = {};
      try {
        cuerpo = JSON.parse(xhr.responseText);
      } catch {
        // respuesta sin JSON: se usa el mensaje genérico de abajo
      }
      if (xhr.status >= 200 && xhr.status < 300 && cuerpo.id) resolve({ id: cuerpo.id });
      else reject(new Error(cuerpo.error ?? "No se pudo subir el archivo."));
    };
    xhr.onerror = () => reject(new Error("Error de conexión al subir."));
    xhr.onabort = () => reject(new Error("Subida cancelada."));
    xhr.open("POST", url);
    xhr.send(formData);
  });
  return { promesa, cancelar: () => xhr.abort() };
}

// Fase 63: diálogo de subida — zona para arrastrar y soltar, varios archivos
// a la vez, progreso real por archivo, reintentar los que fallan y vista
// previa antes de subir. Cada archivo lleva su propio tipo y descripción
// (una subida suele mezclar una factura en PDF con fotos del bien); las
// imágenes llegan precargadas como Fotografía. Sube por
// app/api/activos/[id]/documentos (ver el comentario ahí sobre por qué no
// es un server action).
//
// El contenido es flex en columna, no la grilla por defecto de DialogContent:
// en una grilla la columna se estira al ancho del nombre de archivo más largo
// y desborda el diálogo.
export function DocumentoUploadDialog({ activoId }: { activoId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelacionesRef = useRef(new Map<string, () => void>());
  const detenerRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [archivos, setArchivos] = useState<ArchivoEnCola[]>([]);
  const [vistaPrevia, setVistaPrevia] = useState<{ src: string; mimeType: string; nombre: string } | null>(null);

  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia.src);
    };
  }, [vistaPrevia]);

  const pendientes = archivos.filter(pendiente);
  const sinTipo = pendientes.filter((archivo) => !archivo.tipoDocumento).length;

  function actualizar(key: string, cambios: Partial<ArchivoEnCola>) {
    setArchivos((actuales) => actuales.map((archivo) => (archivo.key === key ? { ...archivo, ...cambios } : archivo)));
  }

  function agregarArchivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const yaAgregados = new Set(archivos.map((archivo) => huella(archivo.file)));
    const nuevos: ArchivoEnCola[] = [];
    let repetidos = 0;
    for (const file of lista) {
      if (yaAgregados.has(huella(file))) {
        repetidos++;
        continue;
      }
      yaAgregados.add(huella(file));
      const error = validarEnCliente(file);
      nuevos.push({
        key: `${huella(file)}|${Math.random().toString(36).slice(2)}`,
        file,
        tipoDocumento: EXTENSIONES_IMAGEN.includes(extensionDe(file.name)) ? "FOTOGRAFIA" : "",
        descripcion: "",
        estado: error ? "error" : "listo",
        progreso: 0,
        error: error ?? undefined,
        reintentable: !error,
      });
    }
    const espacio = MAX_ARCHIVOS - archivos.length;
    if (nuevos.length > espacio) {
      toast.error(`Puedes subir hasta ${MAX_ARCHIVOS} archivos por vez.`);
      nuevos.splice(Math.max(espacio, 0));
    }
    if (repetidos > 0) {
      toast.info(repetidos === 1 ? "Ese archivo ya está en la lista." : `${repetidos} archivos ya estaban en la lista.`);
    }
    setArchivos((actuales) => [...actuales, ...nuevos]);
  }

  async function subirUno(archivo: ArchivoEnCola): Promise<boolean> {
    actualizar(archivo.key, { estado: "subiendo", progreso: 0, error: undefined });
    const formData = new FormData();
    formData.set("file", archivo.file);
    formData.set("tipoDocumento", archivo.tipoDocumento);
    if (archivo.descripcion.trim()) formData.set("descripcion", archivo.descripcion.trim());

    const { promesa, cancelar } = subirConProgreso(`/api/activos/${activoId}/documentos`, formData, (progreso) =>
      actualizar(archivo.key, { progreso })
    );
    cancelacionesRef.current.set(archivo.key, cancelar);
    try {
      const { id } = await promesa;
      actualizar(archivo.key, { estado: "completado", progreso: 100, documentoId: id });
      return true;
    } catch (error) {
      actualizar(archivo.key, {
        estado: "error",
        error: error instanceof Error ? error.message : "No se pudo subir el archivo.",
      });
      return false;
    } finally {
      cancelacionesRef.current.delete(archivo.key);
    }
  }

  async function subir(lote: ArchivoEnCola[]) {
    if (lote.some((archivo) => !archivo.tipoDocumento)) {
      toast.error("Elige el tipo de documento de cada archivo.");
      return;
    }
    setSubiendo(true);
    detenerRef.current = false;
    const cola = [...lote];
    let subidos = 0;
    let fallidos = 0;
    // Hasta SUBIDAS_EN_PARALELO a la vez: cada "trabajador" toma el siguiente de la cola.
    const trabajador = async () => {
      while (cola.length > 0 && !detenerRef.current) {
        const archivo = cola.shift()!;
        if (await subirUno(archivo)) subidos++;
        else fallidos++;
      }
    };
    await Promise.all(Array.from({ length: Math.min(SUBIDAS_EN_PARALELO, lote.length) }, trabajador));
    setSubiendo(false);
    if (detenerRef.current) return;

    if (subidos > 0) router.refresh();
    if (fallidos === 0 && subidos > 0) {
      toast.success(subidos === 1 ? "Documento subido." : `${subidos} documentos subidos.`);
      // Todo subió bien: no queda nada que revisar en el diálogo.
      if (archivos.every((archivo) => lote.includes(archivo) || archivo.estado === "completado")) cerrar();
    } else if (fallidos > 0) {
      toast.error(
        `${subidos > 0 ? `${subidos} subido${subidos === 1 ? "" : "s"}, ` : ""}${fallidos} con error. Revisa la lista.`
      );
    }
  }

  async function quitar(archivo: ArchivoEnCola) {
    if (archivo.estado === "subiendo") {
      cancelacionesRef.current.get(archivo.key)?.();
      return;
    }
    if (archivo.estado === "completado" && archivo.documentoId) {
      try {
        await eliminarDocumentoAction(archivo.documentoId);
        router.refresh();
        toast.success("Documento eliminado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
        return;
      }
    }
    setArchivos((actuales) => actuales.filter((a) => a.key !== archivo.key));
  }

  function previsualizar(archivo: ArchivoEnCola) {
    const mimeType = archivo.file.type || MIME_POR_EXTENSION[extensionDe(archivo.file.name)] || "";
    setVistaPrevia({ src: URL.createObjectURL(archivo.file), mimeType, nombre: archivo.file.name });
  }

  function cerrar() {
    detenerRef.current = true;
    for (const cancelar of cancelacionesRef.current.values()) cancelar();
    setOpen(false);
    setArchivos([]);
  }

  const motivoBloqueo =
    archivos.length === 0
      ? null
      : pendientes.length === 0
        ? null
        : sinTipo > 0
          ? sinTipo === 1
            ? "Falta elegir el tipo de 1 archivo."
            : `Falta elegir el tipo de ${sinTipo} archivos.`
          : null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : cerrar())}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <UploadIcon />
        Subir documentos
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,46rem)] flex-col sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Subir documentos</DialogTitle>
          <DialogDescription>Adjunta facturas, actas, garantías o fotografías del activo.</DialogDescription>
        </DialogHeader>

        <div className="-mx-4 min-h-0 flex-1 space-y-3 overflow-y-auto px-4">
          <button
            type="button"
            disabled={subiendo}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(event) => {
              event.preventDefault();
              setArrastrando(false);
              if (!subiendo) agregarArchivos(event.dataTransfer.files);
            }}
            className={cn(
              "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60",
              archivos.length > 0 ? "py-4" : "py-8",
              arrastrando ? "border-primary bg-primary/5" : "border-input"
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadIcon className="size-4" />
            </span>
            <span className="text-sm font-medium">
              Arrastra y suelta o <span className="text-primary underline-offset-4 hover:underline">examina</span> para
              subir
            </span>
            <span className="text-xs text-muted-foreground">PDF, JPG, PNG o WEBP · hasta 20 MB por archivo</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={EXTENSIONES.join(",")}
            className="hidden"
            onChange={(event) => {
              agregarArchivos(event.target.files);
              event.target.value = "";
            }}
          />

          {archivos.length > 0 && (
            <ul className="space-y-2">
              {archivos.map((archivo) => (
                <ArchivoItem
                  key={archivo.key}
                  archivo={archivo}
                  bloqueado={subiendo && archivo.estado !== "subiendo"}
                  onCambiar={(cambios) => actualizar(archivo.key, cambios)}
                  onQuitar={() => quitar(archivo)}
                  onReintentar={() => subir([archivo])}
                  onPrevisualizar={() => previsualizar(archivo)}
                />
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="items-center">
          {motivoBloqueo && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:mr-auto">
              <CircleAlertIcon className="size-3.5 shrink-0" />
              {motivoBloqueo}
            </p>
          )}
          <Button type="button" variant="outline" onClick={cerrar}>
            {archivos.some((archivo) => archivo.estado === "completado") && pendientes.length === 0
              ? "Cerrar"
              : "Cancelar"}
          </Button>
          <Button type="button" onClick={() => subir(pendientes)} disabled={subiendo || pendientes.length === 0 || sinTipo > 0}>
            <UploadIcon />
            {subiendo ? "Subiendo..." : pendientes.length > 1 ? `Subir ${pendientes.length} archivos` : "Subir"}
          </Button>
        </DialogFooter>

        {/* Anidado dentro del contenido: así Base UI lo trata como diálogo
            hijo y abrirlo no cierra (ni vacía) el de subida. */}
        <DocumentoPreviewDialog
          open={vistaPrevia !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setVistaPrevia(null);
          }}
          src={vistaPrevia?.src ?? null}
          mimeType={vistaPrevia?.mimeType ?? ""}
          nombre={vistaPrevia?.nombre ?? ""}
        />
      </DialogContent>
    </Dialog>
  );
}

function ArchivoItem({
  archivo,
  bloqueado,
  onCambiar,
  onQuitar,
  onReintentar,
  onPrevisualizar,
}: {
  archivo: ArchivoEnCola;
  bloqueado: boolean;
  onCambiar: (cambios: Partial<ArchivoEnCola>) => void;
  onQuitar: () => void;
  onReintentar: () => void;
  onPrevisualizar: () => void;
}) {
  const extension = extensionDe(archivo.file.name);
  const Icono = extension === ".pdf" ? FileTextIcon : EXTENSIONES.includes(extension) ? ImageIcon : FileIcon;
  const valido = archivo.reintentable;
  const editable = pendiente(archivo) && !bloqueado;

  return (
    <li className="min-w-0 rounded-lg border p-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icono className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          {valido ? (
            <button
              type="button"
              onClick={onPrevisualizar}
              className="block w-full truncate text-left text-sm font-medium hover:underline"
              title={`Vista previa de ${archivo.file.name}`}
            >
              {archivo.file.name}
            </button>
          ) : (
            <p className="truncate text-sm font-medium" title={archivo.file.name}>
              {archivo.file.name}
            </p>
          )}
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatFecha(archivo.file.lastModified)} · {formatTamano(archivo.file.size)}
            {archivo.estado === "completado" && ` · ${TIPO_DOCUMENTO_LABELS[archivo.tipoDocumento] ?? ""}`}
          </p>
          {archivo.estado === "completado" && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
              <CircleCheckIcon className="size-3.5" />
              Subido
            </p>
          )}
          {archivo.estado === "error" && (
            <p className="mt-1 flex items-start gap-1 text-xs font-medium text-destructive">
              <CircleAlertIcon className="mt-px size-3.5 shrink-0" />
              {archivo.error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          {archivo.estado === "error" && archivo.reintentable && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={bloqueado || !archivo.tipoDocumento}
              onClick={onReintentar}
              aria-label={`Reintentar ${archivo.file.name}`}
            >
              <RotateCwIcon className="size-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={bloqueado}
            onClick={onQuitar}
            aria-label={
              archivo.estado === "subiendo"
                ? `Cancelar la subida de ${archivo.file.name}`
                : archivo.estado === "completado"
                  ? `Eliminar ${archivo.file.name}`
                  : `Quitar ${archivo.file.name}`
            }
          >
            {archivo.estado === "completado" ? <Trash2Icon className="size-3.5" /> : <XIcon className="size-3.5" />}
          </Button>
        </div>
      </div>

      {valido && archivo.estado !== "completado" && archivo.estado !== "subiendo" && (
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select
            value={archivo.tipoDocumento}
            onValueChange={(value) => onCambiar({ tipoDocumento: value ?? "" })}
            disabled={!editable}
          >
            <SelectTrigger
              size="sm"
              className="w-full"
              aria-label={`Tipo de documento de ${archivo.file.name}`}
              aria-invalid={!archivo.tipoDocumento || undefined}
            >
              <SelectValue placeholder="Tipo de documento" />
            </SelectTrigger>
            <SelectContent>
              {TIPO_DOCUMENTO_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={archivo.descripcion}
            onChange={(event) => onCambiar({ descripcion: event.target.value })}
            disabled={!editable}
            maxLength={255}
            placeholder="Descripción (opcional)"
            aria-label={`Descripción de ${archivo.file.name}`}
            className="h-7 text-xs md:text-xs"
          />
        </div>
      )}

      {archivo.estado === "subiendo" && (
        <div className="mt-2.5 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={archivo.progreso}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Subiendo ${archivo.file.name}`}
          >
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${archivo.progreso}%` }} />
          </div>
          <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{archivo.progreso}%</span>
        </div>
      )}
    </li>
  );
}
