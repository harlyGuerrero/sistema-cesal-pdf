"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateResponsableAction } from "../actions";

const SIN_SEDE = "__ninguna__";

export function ResponsableEditForm({
  responsableId,
  nombres,
  apellidos,
  email,
  cargo,
  documento,
  sedeId,
  sedes,
}: {
  responsableId: string;
  nombres: string;
  apellidos: string;
  email: string;
  cargo: string;
  documento: string;
  sedeId: string;
  sedes: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (formData.get("sedeId") === SIN_SEDE) formData.set("sedeId", "");
        startTransition(async () => {
          try {
            await updateResponsableAction(responsableId, formData);
            toast.success("Responsable actualizado.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
          }
        });
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <div className="space-y-1">
        <Label htmlFor="nombres">Nombres</Label>
        <Input id="nombres" name="nombres" defaultValue={nombres} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="apellidos">Apellidos</Label>
        <Input id="apellidos" name="apellidos" defaultValue={apellidos} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" defaultValue={email} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cargo">Cargo</Label>
        <Input id="cargo" name="cargo" defaultValue={cargo} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="documento">Documento</Label>
        <Input id="documento" name="documento" defaultValue={documento} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sedeId">Sede</Label>
        <Select name="sedeId" defaultValue={sedeId || SIN_SEDE}>
          <SelectTrigger id="sedeId" className="w-full">
            <SelectValue placeholder="Sin sede" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SIN_SEDE}>Sin sede</SelectItem>
            {sedes.map((sede) => (
              <SelectItem key={sede.id} value={sede.id}>
                {sede.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
