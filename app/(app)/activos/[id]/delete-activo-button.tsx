"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
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
import { deleteActivoAction } from "../actions";

// Fase 66: "zona de peligro" al pie de la página de edición, solo para
// SUPER_ADMIN (la página no la muestra a otros roles). Eliminar es para
// corregir un registro hecho por error; si el activo ya tiene historial
// (motivoBloqueo, ver lib/activos/eliminacion.ts), se explica y se remite a
// la baja.
export function DeleteActivoButton({
  activoId,
  nombreActivo,
  motivoBloqueo,
}: {
  activoId: string;
  nombreActivo: string;
  motivoBloqueo: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">Eliminar activo</p>
        <p className="text-xs text-muted-foreground">
          {motivoBloqueo
            ? `No se puede eliminar: ${motivoBloqueo}. Si el bien ya no está en uso, usa «Dar de baja» arriba.`
            : "Solo para registros creados por error o duplicados. Borra el activo de forma definitiva."}
        </p>
      </div>
      {!motivoBloqueo && (
        <Dialog open={open} onOpenChange={(nextOpen) => !isPending && setOpen(nextOpen)}>
          <DialogTrigger render={<Button variant="destructive" size="sm" />}>
            <Trash2Icon />
            Eliminar
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar «{nombreActivo}»?</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. Si el bien existió y dejó de usarse, dalo de baja en su lugar.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await deleteActivoAction(activoId);
                    } catch (err) {
                      if (
                        err &&
                        typeof err === "object" &&
                        "digest" in err &&
                        typeof err.digest === "string" &&
                        err.digest.startsWith("NEXT_REDIRECT")
                      ) {
                        throw err;
                      }
                      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
                    }
                  })
                }
              >
                {isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
