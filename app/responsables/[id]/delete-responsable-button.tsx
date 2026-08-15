"use client";

import { useState, useTransition } from "react";
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
import { deleteResponsableAction } from "../actions";

export function DeleteResponsableButton({
  responsableId,
  hasActivos,
}: {
  responsableId: string;
  hasActivos: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasActivos) {
    return (
      <p className="text-sm text-muted-foreground">
        Este responsable tiene activos asignados — desasígnalos antes de poder eliminarlo.
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>Eliminar responsable</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar este responsable?</DialogTitle>
          <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteResponsableAction(responsableId);
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
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
