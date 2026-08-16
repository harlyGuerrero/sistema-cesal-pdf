"use client";

import { useRef, useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TIPO_DOCUMENTO_OPTIONS } from "@/lib/activos/labels";
import { subirDocumentoAction } from "./documento-actions";

// Fase 10 de Activos: mismo patrón de diálogo que
// app/importaciones/upload-import-dialog.tsx, pero llamando al server action
// directo en vez de fetch a una API route — no hace falta una ruta separada
// para esto (a diferencia de /api/imports, que la tenía desde antes).
export function DocumentoUploadDialog({ activoId }: { activoId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await subirDocumentoAction(activoId, formData);
        setOpen(false);
        formRef.current?.reset();
        toast.success("Documento subido.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo subir el archivo.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <UploadIcon />
        Subir documento
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>Se aceptan PDF, JPG, PNG y WEBP hasta 20 MB.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="tipoDocumento">Tipo de documento</Label>
            <Select name="tipoDocumento" required>
              <SelectTrigger id="tipoDocumento" className="w-full">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_DOCUMENTO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="file">Archivo</Label>
            <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea id="descripcion" name="descripcion" rows={2} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Subiendo..." : "Subir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
