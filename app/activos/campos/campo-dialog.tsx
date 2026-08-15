"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { TIPO_DATO_OPTIONS, TIPOS_DATO_CON_CATALOGO } from "@/lib/activos/labels";

export interface CampoInitial {
  nombre: string;
  etiqueta: string;
  tipoDato: string;
  unidad: string | null;
  catalogoId: string | null;
  obligatorio: boolean;
}

export interface CatalogoOption {
  id: string;
  nombre: string;
}

// Fase 4 de Activos: formulario único reutilizado para crear y editar un
// CampoEspecificacion. El selector de Catálogo solo aparece cuando el tipo
// de dato lo requiere (SELECCION/CATALOGO).
export function CampoDialog({
  trigger,
  title,
  initial,
  catalogos,
  onSubmit,
}: {
  trigger: React.ReactElement;
  title: string;
  initial?: CampoInitial;
  catalogos: CatalogoOption[];
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [tipoDato, setTipoDato] = useState(initial?.tipoDato ?? "TEXTO");
  const [obligatorio, setObligatorio] = useState(initial?.obligatorio ?? false);
  const [isPending, startTransition] = useTransition();

  const requiereCatalogo = TIPOS_DATO_CON_CATALOGO.has(tipoDato);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tipoDato", tipoDato);
    formData.set("obligatorio", obligatorio ? "true" : "");
    startTransition(async () => {
      try {
        await onSubmit(formData);
        setOpen(false);
        toast.success("Campo guardado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setTipoDato(initial?.tipoDato ?? "TEXTO");
          setObligatorio(initial?.obligatorio ?? false);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" defaultValue={initial?.nombre} placeholder="Ej. Memoria RAM" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="etiqueta">Etiqueta (texto visible en el formulario)</Label>
            <Input
              id="etiqueta"
              name="etiqueta"
              defaultValue={initial?.etiqueta}
              placeholder="Ej. Memoria RAM (GB)"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="tipoDato">Tipo de dato</Label>
              <Select value={tipoDato} onValueChange={(value) => setTipoDato(value ?? "TEXTO")}>
                <SelectTrigger id="tipoDato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_DATO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="unidad">Unidad (opcional)</Label>
              <Input id="unidad" name="unidad" defaultValue={initial?.unidad ?? ""} placeholder="Ej. GB" />
            </div>
          </div>
          {requiereCatalogo && (
            <div className="space-y-1">
              <Label htmlFor="catalogoId">Catálogo</Label>
              <Select name="catalogoId" defaultValue={initial?.catalogoId ?? undefined}>
                <SelectTrigger id="catalogoId">
                  <SelectValue placeholder="Selecciona un catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {catalogos.map((catalogo) => (
                    <SelectItem key={catalogo.id} value={catalogo.id}>
                      {catalogo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {catalogos.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay catálogos todavía — créalos en /activos/catalogos.
                </p>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label htmlFor="obligatorio" className="font-normal">
              Obligatorio
            </Label>
            <Switch id="obligatorio" checked={obligatorio} onCheckedChange={setObligatorio} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
