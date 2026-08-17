"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DownloadIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo validar el archivo.");
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
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo importar el archivo.");
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
            Sube un .xlsx con las columnas de la plantilla. Una fila sin código patrimonial crea un activo
            nuevo; una fila con un código existente actualiza ese activo (las celdas vacías no cambian ese
            campo).{" "}
            <a href="/api/activos/import-template" className="underline underline-offset-2 hover:text-foreground">
              Descargar plantilla
            </a>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="import-file">Archivo .xlsx</Label>
            <Input
              id="import-file"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setPreview(null);
                setError(null);
                setFile(event.target.files?.[0] ?? null);
              }}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

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
                        <TableCell className="text-sm">{fila.nombreActivo}</TableCell>
                        <TableCell className="text-xs">
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
          {!preview ? (
            <Button type="button" disabled={!file || isPending} onClick={handleValidar}>
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
