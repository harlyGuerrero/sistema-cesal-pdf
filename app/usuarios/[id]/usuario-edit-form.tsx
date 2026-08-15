"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUsuarioAction } from "../actions";

export function UsuarioEditForm({
  usuarioId,
  nombre,
  email,
}: {
  usuarioId: string;
  nombre: string;
  email: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await updateUsuarioAction(usuarioId, formData);
            toast.success("Usuario actualizado.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
          }
        });
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="space-y-1">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" defaultValue={nombre} required className="w-56" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={email} className="w-56" />
      </div>
      <Button type="submit" disabled={isPending}>
        Guardar
      </Button>
    </form>
  );
}
