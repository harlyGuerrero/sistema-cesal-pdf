"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIPO_DATO_LABELS } from "@/lib/activos/labels";
import { CampoDialog, type CatalogoOption } from "./campo-dialog";
import { createCampoAction, deleteCampoAction, updateCampoAction } from "./actions";

export interface CampoData {
  id: string;
  nombre: string;
  etiqueta: string;
  tipoDato: string;
  unidad: string | null;
  catalogoId: string | null;
  obligatorio: boolean;
  _count: { valores: number };
}

// Fase 4 de Activos: campos de especificación de la subcategoría seleccionada.
export function CampoList({
  subcategoriaId,
  campos,
  catalogos,
}: {
  subcategoriaId: string;
  campos: CampoData[];
  catalogos: CatalogoOption[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(campoId: string) {
    startTransition(async () => {
      try {
        await deleteCampoAction(campoId);
        toast.success("Campo eliminado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {campos.map((campo) => (
          <div key={campo.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{campo.nombre}</span>
              <span className="text-muted-foreground">{campo.etiqueta}</span>
              <Badge variant="outline">{TIPO_DATO_LABELS[campo.tipoDato] ?? campo.tipoDato}</Badge>
              {campo.unidad && <Badge variant="outline">{campo.unidad}</Badge>}
              {campo.obligatorio && <Badge variant="outline">Obligatorio</Badge>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <CampoDialog
                title="Editar campo"
                trigger={
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`Editar ${campo.nombre}`}>
                    <PencilIcon className="size-3.5" />
                  </Button>
                }
                initial={{
                  nombre: campo.nombre,
                  etiqueta: campo.etiqueta,
                  tipoDato: campo.tipoDato,
                  unidad: campo.unidad,
                  catalogoId: campo.catalogoId,
                  obligatorio: campo.obligatorio,
                }}
                catalogos={catalogos}
                onSubmit={(formData) => updateCampoAction(campo.id, formData)}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={isPending || campo._count.valores > 0}
                title={campo._count.valores > 0 ? "Hay activos con valor cargado en este campo" : undefined}
                onClick={() => handleDelete(campo.id)}
                aria-label={`Eliminar ${campo.nombre}`}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {campos.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin campos todavía para esta subcategoría.</p>
        )}
      </div>

      <CampoDialog
        title="Nuevo campo"
        trigger={
          <Button type="button" variant="outline">
            <PlusIcon />
            Nuevo campo
          </Button>
        }
        catalogos={catalogos}
        onSubmit={(formData) => createCampoAction(subcategoriaId, formData)}
      />
    </div>
  );
}
