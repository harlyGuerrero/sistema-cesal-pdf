"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditableRow } from "./editable-row";
import { createSubcategoriaAction, deleteSubcategoriaAction, updateSubcategoriaAction } from "./actions";
import type { SubcategoriaData } from "./types";

export function SubcategoriaList({
  categoriaId,
  subcategorias,
}: {
  categoriaId: string;
  subcategorias: SubcategoriaData[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createSubcategoriaAction(categoriaId, formData);
        form.reset();
        toast.success("Subcategoría creada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear.");
      }
    });
  }

  return (
    <div className="space-y-2 border-t px-3 py-2 pl-6">
      <div className="space-y-1.5">
        {subcategorias.map((subcategoria) => (
          <EditableRow
            key={subcategoria.id}
            name={subcategoria.nombre}
            onRename={async (nombre) => {
              const formData = new FormData();
              formData.set("nombre", nombre);
              await updateSubcategoriaAction(subcategoria.id, formData);
            }}
            onDelete={() => deleteSubcategoriaAction(subcategoria.id)}
            deleteBlockedReason={
              subcategoria._count.campos > 0 ? "Tiene campos de especificación asociados" : undefined
            }
          />
        ))}
        {subcategorias.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin subcategorías todavía.</p>
        )}
      </div>
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input name="nombre" placeholder="Nueva subcategoría" required className="h-7 flex-1 text-sm" />
        <Button
          type="submit"
          size="icon-sm"
          variant="outline"
          disabled={isPending}
          aria-label="Agregar subcategoría"
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
