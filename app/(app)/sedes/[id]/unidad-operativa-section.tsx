"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUnidadOperativaAction, deleteUnidadOperativaAction } from "../actions";

export interface UnidadOperativaRow {
  id: string;
  name: string;
}

// Fase 5 de Activos: Unidad Operativa vive anidada bajo su Sede — sin
// pantalla ni ruta propia, el CRUD completo cabe en esta pestaña.
export function UnidadOperativaSection({
  sedeId,
  unidades,
}: {
  sedeId: string;
  unidades: UnidadOperativaRow[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createUnidadOperativaAction(sedeId, formData);
        form.reset();
        toast.success("Unidad operativa creada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear.");
      }
    });
  }

  function handleDelete(unidadId: string) {
    startTransition(async () => {
      try {
        await deleteUnidadOperativaAction(unidadId);
        toast.success("Unidad operativa eliminada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {unidades.map((unidad) => (
          <li
            key={unidad.id}
            className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
          >
            {unidad.name}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              onClick={() => handleDelete(unidad.id)}
              aria-label={`Eliminar ${unidad.name}`}
            >
              <TrashIcon className="size-3.5" />
            </Button>
          </li>
        ))}
        {unidades.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin unidades operativas todavía.</p>
        )}
      </ul>
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input name="name" placeholder="Ej. CAE - Huachipa" required className="flex-1" />
        <Button type="submit" disabled={isPending} size="icon" variant="outline" aria-label="Agregar unidad operativa">
          <PlusIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
}
