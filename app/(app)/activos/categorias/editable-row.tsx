"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon, PencilIcon, TrashIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Fase 3 de Activos: fila renombrable/eliminable en línea, sin diálogo — se
// reutiliza para CategoriaActivo y SubcategoriaActivo, los dos únicos
// niveles administrables de la taxonomía (ver planificación de Activos §6).
export function EditableRow({
  name,
  onRename,
  onDelete,
  deleteBlockedReason,
  children,
}: {
  name: string;
  onRename: (nombre: string) => Promise<void>;
  onDelete: () => Promise<void>;
  deleteBlockedReason?: string;
  children?: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const nombre = value.trim();
    if (!nombre) return;
    startTransition(async () => {
      try {
        await onRename(nombre);
        setEditing(false);
        toast.success("Guardado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await onDelete();
        toast.success("Eliminado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-1 items-center gap-1.5">
            <Input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-7"
            />
            <Button type="submit" size="icon-sm" variant="ghost" disabled={isPending} aria-label="Guardar">
              <CheckIcon className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setValue(name);
                setEditing(false);
              }}
              aria-label="Cancelar"
            >
              <XIcon className="size-3.5" />
            </Button>
          </form>
        ) : (
          <>
            <span className="flex-1 truncate text-sm">{name}</span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                aria-label={`Editar ${name}`}
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={isPending || Boolean(deleteBlockedReason)}
                title={deleteBlockedReason}
                onClick={handleDelete}
                aria-label={`Eliminar ${name}`}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
      {children}
    </div>
  );
}
