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
import { deleteSedeAction } from "../actions";

export function DeleteSedeButton({
  sedeId,
  hasChildren,
}: {
  sedeId: string;
  hasChildren: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasChildren) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta sede tiene unidades operativas o ambientes asociados — no se puede eliminar (bórralos
        primero).
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>Eliminar sede</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar esta sede?</DialogTitle>
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
                  await deleteSedeAction(sedeId);
                } catch (err) {
                  // redirect() de Next.js señaliza la navegación lanzando un
                  // error con digest "NEXT_REDIRECT;..." — no es un error real.
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
