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
import { updateNumeroFacturaAction } from "./actions";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

// Únicos campos editables de un Import (el resto se fija al subir el PDF).
// El Document Service detecta el N° de factura del propio documento al
// procesarlo (ver invoice_number.py) y llega acá ya precargado — esto queda
// como corrección manual para cuando la detección falla o se equivoca. El
// N° FC, en cambio, es el correlativo interno de CESAL: nunca se autodetecta
// (no está impreso en el PDF del proveedor), siempre se carga a mano acá.
// Ambos se propagan a Activo.numeroFactura/numeroFC al confirmar cada ítem
// (ver activo-creation.ts).
export function NumeroFacturaEditor({
  importId,
  numeroFactura,
  numeroFC,
}: {
  importId: string;
  numeroFactura: string | null;
  numeroFC: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          />
        }
      >
        <ReceiptTextIcon className="size-3.5 shrink-0" />
        {numeroFactura || numeroFC ? (
          <span>
            {numeroFactura ? `N° de factura: ${numeroFactura}` : "Sin N° de factura"}
            {numeroFC ? ` · N° FC: ${numeroFC}` : " · Sin N° FC"}
          </span>
        ) : (
          <span className="italic">Sin número de factura ni N° FC</span>
        )}
        <PencilIcon className="size-3 shrink-0" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Número de factura</DialogTitle>
        </DialogHeader>
        <form
          id="numero-factura-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              try {
                await updateNumeroFacturaAction(importId, formData);
                toast.success("Número de factura actualizado.");
                setOpen(false);
              } catch (error) {
                toast.error(errorMessage(error));
              }
            });
          }}
          className="space-y-3"
        >
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
