"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { EyeIcon, MoreVerticalIcon, PencilIcon, TrashIcon } from "lucide-react";
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
import { deleteActivoAction } from "./actions";

// Fase 19: acciones por fila en /activos — ver ficha, editar, y un menú con
// "Eliminar" (mismo guard que DeleteActivoButton en la ficha: un activo con
// historial de importación o documentos adjuntos no se puede borrar, acá se
// descubre recién al intentarlo porque listar 20+ filas no vale la pena
// cargar _count.documentos solo para decidir si el botón está habilitado).
export function ActivoRowActions({ activoId, nombreActivo }: { activoId: string; nombreActivo: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteActivoAction(activoId);
        toast.success("Activo eliminado.");
        setConfirmOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          render={<Link href={`/activos/${activoId}/ficha`} aria-label="Ver ficha técnica" />}
          nativeButton={false}
        >
          <EyeIcon />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          render={<Link href={`/activos/${activoId}`} aria-label="Editar" />}
          nativeButton={false}
        >
          <PencilIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="icon-sm" variant="ghost" aria-label="Más acciones" />}
          >
            <MoreVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar «{nombreActivo}»?</DialogTitle>
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
