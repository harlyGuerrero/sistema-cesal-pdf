"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { nombreCompleto } from "@/lib/nombre-completo";
import { asignarResponsableAction, desasignarResponsableAction } from "../actions";

export interface ResponsableOption {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
}

// Sin tildes ni mayúsculas: "jose" encuentra a "José".
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Busca por nombre completo o correo; cada palabra de la búsqueda debe
// aparecer en alguno de los dos ("ana gar" encuentra a "Ana García").
function coincideResponsable(responsable: ResponsableOption, query: string): boolean {
  const texto = normalizar(`${nombreCompleto(responsable)} ${responsable.email}`);
  return normalizar(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((palabra) => texto.includes(palabra));
}

// Con muchos responsables no se pintan todos: se muestran los primeros y el
// resto aparece al escribir.
const MAX_RESULTADOS = 50;

// Fase 8 de Activos: asignar cambia responsableActualId + estadoPatrimonial
// a ASIGNADO; desasignar los vuelve a null / DISPONIBLE. Sin historial
// todavía — eso llega con Movimiento (Fase 9).
// Fase 58: el Select pasa a Combobox con búsqueda por nombre o correo.
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
  const selectedOption = responsables.find((responsable) => responsable.id === selected) ?? null;

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
        <Combobox<ResponsableOption>
          items={responsables}
          value={selectedOption}
          onValueChange={(option) => setSelected(option?.id ?? "")}
          itemToStringLabel={(option) => nombreCompleto(option)}
          itemToStringValue={(option) => option.id}
          isItemEqualToValue={(option, value) => option.id === value.id}
          filter={(option, query) => coincideResponsable(option, query)}
          limit={MAX_RESULTADOS}
        >
          <ComboboxInput id="responsableSelect" placeholder="Buscar por nombre o correo…" className="w-full" />
          <ComboboxContent>
            <ComboboxEmpty>Ningún responsable coincide.</ComboboxEmpty>
            <ComboboxList>
              {(responsable: ResponsableOption) => (
                <ComboboxItem key={responsable.id} value={responsable}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{nombreCompleto(responsable)}</span>
                    <span className="truncate text-xs text-muted-foreground">{responsable.email}</span>
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
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
