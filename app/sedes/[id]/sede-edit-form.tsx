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
import { REGION_OPTIONS } from "@/lib/sedes/labels";
import { updateSedeAction } from "../actions";

export function SedeEditForm({
  sedeId,
  name,
  city,
  region,
}: {
  sedeId: string;
  name: string;
  city: string;
  region: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await updateSedeAction(sedeId, formData);
            toast.success("Sede actualizada.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
          }
        });
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="space-y-1">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" defaultValue={name} required className="w-56" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="city">Ciudad</Label>
        <Input id="city" name="city" defaultValue={city} required className="w-48" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="region">Región</Label>
        <Select name="region" defaultValue={region}>
          <SelectTrigger id="region" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending}>
        Guardar
      </Button>
    </form>
  );
}
