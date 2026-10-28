"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleAlertIcon, DownloadIcon, FileSpreadsheetIcon, UploadIcon, XIcon } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExportQuery {
  q?: string;
  tipoActivoId?: string;
  sedeId?: string;
  estadoPatrimonial?: string;
}

interface PreviewRowOk {
  rowNumber: number;
  status: "ok";
  action: "crear" | "actualizar";
  nombreActivo: string;
  codigoPatrimonial: string | null;
  resumen: string[];
}
interface PreviewRowError {
  rowNumber: number;
  status: "error";
  nombreActivo: string;
  errores: string[];
}
type PreviewRow = PreviewRowOk | PreviewRowError;

interface PreviewResponse {
  totalFilas: number;
  crear: number;
  actualizar: number;
  conError: number;
  filas: PreviewRow[];
}

// Mismos límites que valida el servidor (lib/security/excel-validation.ts);
// acá solo sirven para avisar antes de subir.
const MAX_EXCEL_BYTES = 5 * 1024 * 1024;

function formatTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFecha(ms: number): string {
  return new Date(ms).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function validarExcelEnCliente(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".xlsx")) return "Solo se aceptan archivos .xlsx (Excel).";
  if (file.size > MAX_EXCEL_BYTES) return "El archivo supera el máximo de 5 MB.";
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

// Lee la respuesta JSON de /api/activos/import. Sin sesión, proxy.ts
// redirige a /login y fetch devuelve esa página HTML: se traduce a un
// mensaje entendible en vez del error de parseo de JSON.
async function leerRespuesta(response: Response, mensajeError: string) {
  if (new URL(response.url).pathname.startsWith("/login")) {
    throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(mensajeError);
  }
  if (!response.ok) throw new Error(result.error ?? mensajeError);
  return result;
}

function buildExportHref(query: ExportQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.tipoActivoId) params.set("tipoActivoId", query.tipoActivoId);
  if (query.sedeId) params.set("sedeId", query.sedeId);
  if (query.estadoPatrimonial) params.set("estadoPatrimonial", query.estadoPatrimonial);
  const qs = params.toString();
  return qs ? `/api/activos/export?${qs}` : "/api/activos/export";
}

// Fase 40: exportar es un simple <a> a una ruta GET (no necesita JS ni
// diálogo) — importar sí necesita estado (vista previa antes de confirmar),
// por eso viven juntos acá como una sola barra pero con mecánicas distintas.
export function ImportExportActivosBar({ exportQuery }: { exportQuery: ExportQuery }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        render={<a href={buildExportHref(exportQuery)} />}
        nativeButton={false}
      >
        <DownloadIcon />
        Exportar
      </Button>
      <ImportActivosDialog />
    </div>
  );
}

function ImportActivosDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  // Error de formato/tamaño detectado antes de subir: ese archivo no se puede validar.
  const archivoInvalido = file !== null && validarExcelEnCliente(file) !== null;

  function elegir(lista: FileList | null) {
    const elegido = lista?.[0];
    if (!elegido) return;
    if (lista.length > 1) toast.info("Se importa un archivo a la vez: se tomó el primero.");
    setFile(elegido);
    setPreview(null);
    setError(validarExcelEnCliente(elegido));
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleValidar() {
    if (!file) return;
    setIsPending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("mode", "preview");
      const response = await fetch("/api/activos/import", { method: "POST", body: formData });
      const result = await leerRespuesta(response, "No se pudo validar el archivo.");
      setPreview(result as PreviewResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo validar el archivo.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleConfirmar() {
    if (!file) return;
    setIsPending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("mode", "commit");
      const response = await fetch("/api/activos/import", { method: "POST", body: formData });
      const result = await leerRespuesta(response, "No se pudo importar el archivo.");
      const omitidos = result.omitidos > 0 ? `, ${result.omitidos} omitidas por error` : "";
      toast.success(`Importación completa: ${result.creados} creados, ${result.actualizados} actualizados${omitidos}.`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar el archivo.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <UploadIcon />
        Importar
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar activos desde Excel</DialogTitle>
          <DialogDescription>
            Una fila sin código patrimonial crea un activo nuevo; una fila con un código existente actualiza ese
            activo (las celdas vacías no cambian ese campo).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fase 64: mismo diseño de carga que Documentos e Importaciones. */}
          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
                "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                arrastrando ? "border-primary bg-primary/5" : "border-input"
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadIcon className="size-4.5" />
              </span>
              <span className="text-sm font-medium">
                Arrastra el Excel aquí o <span className="text-primary underline-offset-4 hover:underline">examina</span>
              </span>
              <span className="text-xs text-muted-foreground">Formato .xlsx · hasta 5 MB y 2000 filas</span>
            </button>
          ) : (
            <div className="min-w-0 rounded-lg border p-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileSpreadsheetIcon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatFecha(file.lastModified)} · {formatTamano(file.size)}
                  </p>
                  {error ? (
                    <p className="mt-1 flex items-start gap-1 text-xs font-medium text-destructive">
                      <CircleAlertIcon className="mt-px size-3.5 shrink-0" />
                      {error}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isPending ? "Revisando las filas…" : preview ? "Archivo validado" : "Listo para validar"}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  onClick={reset}
                  aria-label={`Quitar ${file.name}`}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              elegir(event.target.files);
              event.target.value = "";
            }}
          />
          <a
            href="/api/activos/import-template"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <FileSpreadsheetIcon className="size-3.5 text-primary" />
            <span>
              <span className="font-medium text-primary underline-offset-4 hover:underline">Descargar plantilla</span>{" "}
              con las columnas que espera la importación
            </span>
          </a>

          {preview && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="border-[var(--color-good)] text-[var(--color-good)]">
                  {preview.crear} para crear
                </Badge>
                <Badge variant="outline" className="border-primary text-primary">
                  {preview.actualizar} para actualizar
                </Badge>
                {preview.conError > 0 && (
                  <Badge variant="outline" className="border-destructive text-destructive">
                    {preview.conError} con error
                  </Badge>
                )}
                <span className="text-muted-foreground">de {preview.totalFilas} filas</span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Fila</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.filas.map((fila) => (
                      <TableRow key={fila.rowNumber}>
                        <TableCell className="text-xs text-muted-foreground">{fila.rowNumber}</TableCell>
                        <TableCell className="text-sm whitespace-normal wrap-break-word">{fila.nombreActivo}</TableCell>
                        <TableCell className="text-xs whitespace-normal wrap-break-word">
                          {fila.status === "error" ? (
                            <ul className="space-y-0.5 text-destructive">
                              {fila.errores.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          ) : (
                            <ul className="space-y-0.5 text-muted-foreground">
                              {fila.resumen.map((linea, i) => (
                                <li key={i}>{linea}</li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.conError > 0 && (
                <p className="text-xs text-muted-foreground">
                  Las filas con error no se importarán — corrígelas en el Excel y vuelve a subirlo, o confirma
                  ahora y solo se aplicarán las filas válidas.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            Cancelar
          </Button>
          {!preview ? (
            <Button type="button" disabled={!file || archivoInvalido || isPending} onClick={handleValidar}>
              <FileSpreadsheetIcon />
              {isPending ? "Validando..." : "Validar archivo"}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isPending || preview.crear + preview.actualizar === 0}
              onClick={handleConfirmar}
            >
              {isPending ? "Importando..." : `Confirmar importación (${preview.crear + preview.actualizar})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
