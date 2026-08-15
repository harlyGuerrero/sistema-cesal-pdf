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
import { REGION_OPTIONS } from "@/lib/sedes/labels";
import { createSedeAction } from "../actions";

export function NewSedeForm() {
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
            await createSedeAction(formData);
          } catch (err) {
            // redirect() de Next.js señaliza la navegación lanzando un error
            // con digest "NEXT_REDIRECT;..." — hay que dejarlo pasar, no es
            // un error real. Ver app/productos/nuevo/new-product-form.tsx.
            if (
              err &&
              typeof err === "object" &&
              "digest" in err &&
              typeof err.digest === "string" &&
              err.digest.startsWith("NEXT_REDIRECT")
            ) {
              throw err;
            }
            setError(err instanceof Error ? err.message : "No se pudo crear la sede.");
          }
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" placeholder="Ej. Huachipa" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="region">Región</Label>
        <Select name="region" required>
          <SelectTrigger id="region" className="w-full">
            <SelectValue placeholder="Selecciona una región" />
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        Crear sede
      </Button>
    </form>
  );
}
