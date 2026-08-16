"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreVerticalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteUsuarioAction } from "./actions";

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

// Fase 29: acciones por fila en /usuarios — mismo patrón que
// ActivoRowActions (editar + eliminar con diálogo de confirmación). No se
// puede eliminar la propia cuenta (mismo límite que DeleteUsuarioButton en
// la ficha de edición) — acá se oculta la opción directamente en vez de
// mostrarla deshabilitada, ya que nunca es una acción válida en esa fila.
export function UsuarioRowActions({
  usuarioId,
  nombre,
  esUsuarioActual,
}: {
  usuarioId: string;
  nombre: string;
  esUsuarioActual: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteUsuarioAction(usuarioId);
        toast.success("Usuario eliminado.");
        setConfirmOpen(false);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="icon-sm" variant="ghost" aria-label="Más acciones" />}
        >
          <MoreVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/usuarios/${usuarioId}`} />}>
            <PencilIcon />
            Editar
          </DropdownMenuItem>
          {!esUsuarioActual && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                setError(null);
                setConfirmOpen(true);
              }}
            >
              <TrashIcon />
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar a «{nombre}»?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
