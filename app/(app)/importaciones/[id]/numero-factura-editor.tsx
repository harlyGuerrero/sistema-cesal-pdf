"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PencilIcon, ReceiptTextIcon } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IGV_TRATAMIENTO_LABELS, IGV_TRATAMIENTO_OPTIONS, formatMonto } from "@/lib/activos/igv";
import type { IgvTratamiento } from "@/lib/generated/prisma/client";
import { updateNumeroFacturaAction } from "./actions";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

const SIN_DEFINIR = "SIN_DEFINIR";

// Únicos campos editables de un Import (el resto se fija al subir el PDF).
// El Document Service detecta el N° de factura y el importe total del propio
// documento al procesarlo (ver invoice_number.py / invoice_total.py) y llegan
// acá ya precargados — esto queda como corrección manual para cuando la
// detección falla o se equivoca. El N° FC, en cambio, es el correlativo
// interno de CESAL: nunca se autodetecta (no está impreso en el PDF del
// proveedor), siempre se carga a mano acá. N° de factura y N° FC se propagan
// a Activo.numeroFactura/numeroFC al confirmar cada ítem (ver
// activo-creation.ts).
//
// Fase 57: el tratamiento de IGV tampoco se autodetecta — el extractor lee
// un precio unitario pero no sabe si lo incluye. La ficha técnica de cada
// activo calcula el precio sin/con IGV a partir de esto (lib/activos/igv.ts).
export function NumeroFacturaEditor({
  importId,
  numeroFactura,
  numeroFC,
  totalFactura,
  igvTratamiento,
  currency,
}: {
  importId: string;
  numeroFactura: string | null;
  numeroFC: string | null;
  totalFactura: number | null;
  igvTratamiento: IgvTratamiento | null;
  currency: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const simbolo = formatMonto(0, currency)?.split(" ")[0] ?? "S/";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="mt-1 flex items-start gap-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
          />
        }
      >
        <ReceiptTextIcon className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {numeroFactura ? `N° de factura: ${numeroFactura}` : "Sin N° de factura"}
          {numeroFC ? ` · N° FC: ${numeroFC}` : " · Sin N° FC"}
          {totalFactura !== null ? ` · Total: ${formatMonto(totalFactura, currency)}` : " · Sin total"}
          {igvTratamiento ? ` · ${IGV_TRATAMIENTO_LABELS[igvTratamiento]}` : " · IGV sin definir"}
        </span>
        <PencilIcon className="mt-1 size-3 shrink-0" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Datos de la factura</DialogTitle>
        </DialogHeader>
        <form
          id="numero-factura-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            if (formData.get("igvTratamiento") === SIN_DEFINIR) formData.set("igvTratamiento", "");
            startTransition(async () => {
              try {
                await updateNumeroFacturaAction(importId, formData);
                toast.success("Datos de la factura actualizados.");
                setOpen(false);
              } catch (error) {
                toast.error(errorMessage(error));
              }
            });
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="numeroFactura">N° de factura</Label>
              <Input
                id="numeroFactura"
                name="numeroFactura"
                defaultValue={numeroFactura ?? ""}
                placeholder="Ej. F001-00123"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="numeroFC">N° FC (correlativo interno CESAL)</Label>
              <Input id="numeroFC" name="numeroFC" defaultValue={numeroFC ?? ""} placeholder="Ej. FC-0456" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="totalFactura">Total de la factura</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                  {simbolo}
                </span>
                <Input
                  id="totalFactura"
                  name="totalFactura"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={totalFactura ?? ""}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="igvTratamiento">Precios de la factura</Label>
              <Select name="igvTratamiento" defaultValue={igvTratamiento ?? SIN_DEFINIR}>
                <SelectTrigger id="igvTratamiento" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_DEFINIR}>Sin definir</SelectItem>
                  {IGV_TRATAMIENTO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Indica si los precios unitarios de la factura incluyen el IGV (18%). Con eso, la ficha de cada activo
            muestra su precio sin y con IGV.
          </p>
        </form>
        <DialogFooter>
          <Button type="submit" form="numero-factura-form" disabled={isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
