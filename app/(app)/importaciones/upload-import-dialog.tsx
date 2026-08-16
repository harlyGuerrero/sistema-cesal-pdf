"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadIcon } from "lucide-react";
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

interface UploadResponse {
  status: "processed" | "duplicate" | "failed";
  importId: string;
  itemCount?: number;
  error?: string;
}

export function UploadImportDialog() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Selecciona un archivo PDF.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/imports", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as UploadResponse | { error: string };

      if (!response.ok) {
        if ("status" in result && result.status === "duplicate") {
          toast.error("Este PDF ya fue importado antes.");
          setOpen(false);
          formRef.current?.reset();
          router.push(`/importaciones/${result.importId}`);
          return;
        }
        setError(("error" in result && result.error) || "No se pudo subir el archivo.");
        return;
      }

      const processed = result as UploadResponse;
      if (processed.status === "failed") {
        toast.error("El procesamiento del PDF falló.");
      } else {
        toast.success(`PDF procesado: ${processed.itemCount ?? 0} candidatos detectados.`);
      }
      setOpen(false);
      formRef.current?.reset();
      router.push(`/importaciones/${processed.importId}`);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <DialogTrigger render={<Button />}>
        <UploadIcon />
        Importar PDF
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar factura en PDF</DialogTitle>
          <DialogDescription>
            El PDF se procesa automáticamente: se detecta la tabla de productos, se clasifican
            los ítems y quedan listos para revisión.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="file">Archivo PDF</Label>
            <Input id="file" name="file" type="file" accept="application/pdf,.pdf" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="numeroFactura">N° de factura (opcional)</Label>
            <Input id="numeroFactura" name="numeroFactura" placeholder="Ej. F001-00123" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Procesando..." : "Subir e importar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
