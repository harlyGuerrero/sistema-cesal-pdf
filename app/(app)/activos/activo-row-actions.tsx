"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArchiveXIcon, EyeIcon, MoreVerticalIcon, PencilIcon, RotateCcwIcon, TagIcon, TrashIcon } from "lucide-react";
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
import type { EstadoPatrimonial } from "@/lib/generated/prisma/client";
import { deleteActivoAction } from "./actions";
import { DarDeBajaDialog } from "./baja-activo-dialogs";

// Fase 19: acciones por fila en /activos — ver ficha, editar, y un menú con
// "Dar de baja" y "Eliminar". Fase 66: "Eliminar" solo aparece para
// SUPER_ADMIN; si el activo tiene historial el servidor lo rechaza (ver
// lib/activos/eliminacion.ts) y el diálogo ofrece darlo de baja en su lugar —
// acá se descubre recién al intentarlo porque contar el historial de cada
// fila de un listado no vale la pena solo para decidir el menú. Un activo ya
// dado de baja se reactiva desde su página, donde se ve el motivo.
function esRedirect(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "digest" in err &&
    typeof err.digest === "string" &&
    err.digest.startsWith("NEXT_REDIRECT")
  );
}

export function ActivoRowActions({
  activoId,
  nombreActivo,
  estadoPatrimonial,
  puedeEliminar = false,
}: {
  activoId: string;
  nombreActivo: string;
  estadoPatrimonial: EstadoPatrimonial;
  puedeEliminar?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bajaOpen, setBajaOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dadoDeBaja = estadoPatrimonial === "BAJA";

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteActivoAction(activoId);
      } catch (err) {
        if (esRedirect(err)) {
          toast.success("Activo eliminado.");
          throw err;
        }
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
            <DropdownMenuItem render={<Link href={`/activos/${activoId}/etiqueta`} />}>
              <TagIcon />
              Imprimir etiqueta
            </DropdownMenuItem>
            {dadoDeBaja ? (
              <DropdownMenuItem render={<Link href={`/activos/${activoId}`} />}>
                <RotateCcwIcon />
                Reactivar…
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setBajaOpen(true)}>
                <ArchiveXIcon />
                Dar de baja
              </DropdownMenuItem>
            )}
            {puedeEliminar && (
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
      </div>

      {!dadoDeBaja && (
        <DarDeBajaDialog activoId={activoId} nombreActivo={nombreActivo} open={bajaOpen} onOpenChange={setBajaOpen} />
      )}

      <Dialog open={confirmOpen} onOpenChange={(nextOpen) => !isPending && setConfirmOpen(nextOpen)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar «{nombreActivo}»?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Si el bien existió y dejó de usarse, dalo de baja en su lugar.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            {error && !dadoDeBaja ? (
              <Button
                onClick={() => {
                  setConfirmOpen(false);
                  setBajaOpen(true);
                }}
              >
                <ArchiveXIcon />
                Dar de baja en su lugar
              </Button>
            ) : (
              <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
                {isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
