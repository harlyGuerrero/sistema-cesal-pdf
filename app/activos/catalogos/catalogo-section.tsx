"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditableRow } from "../categorias/editable-row";
import {
  createCatalogoValorAction,
  deleteCatalogoAction,
  deleteCatalogoValorAction,
  updateCatalogoAction,
  updateCatalogoValorAction,
} from "./actions";

export interface CatalogoValorData {
  id: string;
  valor: string;
  _count: { especificaciones: number };
}

export interface CatalogoData {
  id: string;
  nombre: string;
  _count: { valores: number; campos: number };
  valores: CatalogoValorData[];
}

// Fase 4 de Activos: un Catalogo (ej. MARCA) con sus CatalogoValor (ej.
// Lenovo, HP, Dell) — mismo patrón de CRUD anidado que Sede/UnidadOperativa
// (Fase 5) y Categoria/Subcategoria (Fase 3): EditableRow del padre, con la
// lista de hijos como children.
export function CatalogoSection({ catalogo }: { catalogo: CatalogoData }) {
  const [isPending, startTransition] = useTransition();

  function handleCreateValor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createCatalogoValorAction(catalogo.id, formData);
        form.reset();
        toast.success("Valor agregado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear.");
      }
    });
  }

  return (
    <EditableRow
      name={catalogo.nombre}
      onRename={async (nombre) => {
        const formData = new FormData();
        formData.set("nombre", nombre);
        await updateCatalogoAction(catalogo.id, formData);
      }}
      onDelete={() => deleteCatalogoAction(catalogo.id)}
      deleteBlockedReason={
        catalogo._count.valores > 0
          ? "Tiene valores asociados"
          : catalogo._count.campos > 0
            ? "Hay campos de especificación que lo usan"
            : undefined
      }
    >
      <div className="space-y-2 border-t px-3 py-2 pl-6">
        <div className="space-y-1.5">
          {catalogo.valores.map((valor) => (
            <EditableRow
              key={valor.id}
              name={valor.valor}
              onRename={async (nombre) => {
                const formData = new FormData();
                formData.set("valor", nombre);
                await updateCatalogoValorAction(valor.id, formData);
              }}
              onDelete={() => deleteCatalogoValorAction(valor.id)}
              deleteBlockedReason={
                valor._count.especificaciones > 0 ? "Hay activos que usan este valor" : undefined
              }
            />
          ))}
          {catalogo.valores.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin valores todavía.</p>
          )}
        </div>
        <form onSubmit={handleCreateValor} className="flex gap-2">
          <Input name="valor" placeholder="Nuevo valor" required className="h-7 flex-1 text-sm" />
          <Button
            type="submit"
            size="icon-sm"
            variant="outline"
            disabled={isPending}
            aria-label="Agregar valor"
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </form>
      </div>
    </EditableRow>
  );
}
