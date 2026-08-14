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
import { deleteProductAction } from "../actions";

export function DeleteProductButton({
  productId,
  hasHistory,
}: {
  productId: string;
  hasHistory: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasHistory) {
    return (
      <p className="text-sm text-muted-foreground">
        Este producto tiene importaciones asociadas — no se puede eliminar (ver historial arriba).
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>Eliminar producto</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar este producto?</DialogTitle>
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
                  await deleteProductAction(productId);
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
