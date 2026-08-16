"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditableRow } from "./editable-row";
import { SubcategoriaList } from "./subcategoria-list";
import { createCategoriaAction, deleteCategoriaAction, updateCategoriaAction } from "./actions";
import type { CategoriaData } from "./types";

// Fase 3 de Activos, restilizada en Fase 27: contenido de un TipoActivo (fijo,
// 6 en total — ver Fase 2), con sus CategoriaActivo administrables anidadas.
// Sin tarjeta ni encabezado propio: page.tsx la renderiza dentro de un
// AccordionContent, que colapsa cada TipoActivo por separado — el nombre y
// el conteo de categorías ya se muestran en el AccordionTrigger, mostrarlos
// otra vez acá sería redundante.
export function CategoriaSection({
  tipoActivoId,
  categorias,
}: {
  tipoActivoId: string;
  categorias: CategoriaData[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createCategoriaAction(tipoActivoId, formData);
        form.reset();
        toast.success("Categoría creada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {categorias.map((categoria) => (
          <EditableRow
            key={categoria.id}
            name={categoria.nombre}
            onRename={async (nombre) => {
              const formData = new FormData();
              formData.set("nombre", nombre);
              await updateCategoriaAction(categoria.id, formData);
            }}
            onDelete={() => deleteCategoriaAction(categoria.id)}
            deleteBlockedReason={
              categoria._count.subcategorias > 0 ? "Tiene subcategorías asociadas" : undefined
            }
          >
            <SubcategoriaList categoriaId={categoria.id} subcategorias={categoria.subcategorias} />
          </EditableRow>
        ))}
        {categorias.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin categorías todavía.</p>
        )}
      </div>
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input name="nombre" placeholder="Nueva categoría" required className="flex-1" />
        <Button type="submit" size="icon" variant="outline" disabled={isPending} aria-label="Agregar categoría">
          <PlusIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
}
