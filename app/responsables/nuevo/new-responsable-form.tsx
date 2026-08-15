"use client";

import { useState, useTransition } from "react";
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
import { createResponsableAction } from "../actions";

export function NewResponsableForm({ sedes }: { sedes: { id: string; name: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await createResponsableAction(formData);
          } catch (err) {
            if (
              err &&
              typeof err === "object" &&
              "digest" in err &&
              typeof err.digest === "string" &&
              err.digest.startsWith("NEXT_REDIRECT")
            ) {
              throw err;
            }
            setError(err instanceof Error ? err.message : "No se pudo crear el responsable.");
          }
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cargo">Cargo (opcional)</Label>
        <Input id="cargo" name="cargo" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="documento">Documento (opcional)</Label>
        <Input id="documento" name="documento" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sedeId">Sede (opcional)</Label>
        <Select name="sedeId">
          <SelectTrigger id="sedeId" className="w-full">
            <SelectValue placeholder="Sin sede" />
          </SelectTrigger>
          <SelectContent>
            {sedes.map((sede) => (
              <SelectItem key={sede.id} value={sede.id}>
                {sede.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        Crear responsable
      </Button>
    </form>
  );
}
