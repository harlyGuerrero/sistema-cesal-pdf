"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAmbienteAction, deleteAmbienteAction } from "../actions";

export interface AmbienteRow {
  id: string;
  name: string;
  unidadOperativa: { id: string; name: string } | null;
}

export interface UnidadOperativaOption {
  id: string;
  name: string;
}

const SIN_UNIDAD = "sin-unidad";

// Fase 5 de Activos: igual que UnidadOperativaSection, Ambiente vive
// anidado bajo su Sede. unidadOperativaId es opcional a propósito — sedes
// sin unidad operativa definida (Abancay, Andahuaylas, Apurímac, Atalaya)
// igual pueden tener ambientes.
export function AmbienteSection({
  sedeId,
  ambientes,
  unidadesOperativas,
}: {
  sedeId: string;
  ambientes: AmbienteRow[];
  unidadesOperativas: UnidadOperativaOption[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (formData.get("unidadOperativaId") === SIN_UNIDAD) {
      formData.set("unidadOperativaId", "");
    }
    startTransition(async () => {
      try {
        await createAmbienteAction(sedeId, formData);
        form.reset();
        toast.success("Ambiente creado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear.");
      }
    });
  }

  function handleDelete(ambienteId: string) {
    startTransition(async () => {
      try {
        await deleteAmbienteAction(ambienteId);
        toast.success("Ambiente eliminado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {ambientes.map((ambiente) => (
          <li
            key={ambiente.id}
            className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
          >
            <span className="flex items-center gap-2">
              {ambiente.name}
              {ambiente.unidadOperativa && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {ambiente.unidadOperativa.name}
                </span>
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              onClick={() => handleDelete(ambiente.id)}
              aria-label={`Eliminar ${ambiente.name}`}
            >
              <TrashIcon className="size-3.5" />
            </Button>
          </li>
        ))}
        {ambientes.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin ambientes todavía.</p>
        )}
      </ul>
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
        <Input name="name" placeholder="Ej. Almacén principal" required className="flex-1" />
        <Select name="unidadOperativaId" defaultValue={SIN_UNIDAD}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SIN_UNIDAD}>Sin unidad operativa</SelectItem>
            {unidadesOperativas.map((unidad) => (
              <SelectItem key={unidad.id} value={unidad.id}>
                {unidad.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={isPending} size="icon" variant="outline" aria-label="Agregar ambiente">
          <PlusIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
}
