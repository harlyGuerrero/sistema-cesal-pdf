"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUsuarioAction } from "../actions";

export function NewUsuarioForm() {
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
            await createUsuarioAction(formData);
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
            setError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
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
        <Label htmlFor="email">Email (opcional)</Label>
        <Input id="email" name="email" type="email" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        Crear usuario
      </Button>
    </form>
  );
}
