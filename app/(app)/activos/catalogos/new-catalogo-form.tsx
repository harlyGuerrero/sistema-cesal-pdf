"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCatalogoAction } from "./actions";

export function NewCatalogoForm() {
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createCatalogoAction(formData);
        form.reset();
        toast.success("Catálogo creado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear.");
      }
    });
  }

  return (
    <form onSubmit={handleCreate} className="flex gap-2">
      <Input name="nombre" placeholder="Ej. Marca" required className="flex-1" />
      <Button type="submit" disabled={isPending}>
        <PlusIcon />
        Nuevo catálogo
      </Button>
    </form>
  );
}
