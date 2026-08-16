"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nombreCompleto } from "@/lib/nombre-completo";
import { asignarResponsableAction, desasignarResponsableAction } from "../actions";

export interface ResponsableOption {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
}

// Fase 8 de Activos: asignar cambia responsableActualId + estadoPatrimonial
// a ASIGNADO; desasignar los vuelve a null / DISPONIBLE. Sin historial
// todavía — eso llega con Movimiento (Fase 9).
export function ResponsableSection({
  activoId,
  responsableActualId,
  responsables,
}: {
  activoId: string;
  responsableActualId: string | null;
  responsables: ResponsableOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(responsableActualId ?? "");

  function handleAsignar() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await asignarResponsableAction(activoId, selected);
        toast.success("Activo asignado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo asignar.");
      }
    });
  }

  function handleDesasignar() {
    startTransition(async () => {
      try {
        await desasignarResponsableAction(activoId);
        setSelected("");
        toast.success("Activo desasignado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo desasignar.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-56 flex-1 space-y-1">
        <Label htmlFor="responsableSelect">Responsable actual</Label>
        <Select value={selected} onValueChange={(value) => setSelected(value ?? "")}>
          <SelectTrigger id="responsableSelect" className="w-full">
            <SelectValue placeholder="Sin asignar" />
          </SelectTrigger>
          <SelectContent>
            {responsables.map((responsable) => (
              <SelectItem key={responsable.id} value={responsable.id}>
                {nombreCompleto(responsable)} — {responsable.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" disabled={isPending || !selected} onClick={handleAsignar}>
        Asignar
      </Button>
      {responsableActualId && (
        <Button type="button" variant="outline" disabled={isPending} onClick={handleDesasignar}>
          Desasignar
        </Button>
      )}
    </div>
  );
}
