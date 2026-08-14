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
import { createProductAction } from "../actions";

export function NewProductForm({ categories }: { categories: { id: string; name: string }[] }) {
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
            await createProductAction(formData);
          } catch (err) {
            // redirect() de Next.js señaliza la navegación lanzando un error
            // con digest "NEXT_REDIRECT;..." — hay que dejarlo pasar, no es
            // un error real. Ver app/productos/[id]/delete-product-button.tsx
            // para el mismo patrón.
            if (
              err &&
              typeof err === "object" &&
              "digest" in err &&
              typeof err.digest === "string" &&
              err.digest.startsWith("NEXT_REDIRECT")
            ) {
              throw err;
            }
            setError(err instanceof Error ? err.message : "No se pudo crear el producto.");
          }
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="categoryId">Categoría</Label>
        <Select name="categoryId" required>
          <SelectTrigger id="categoryId" className="w-full">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        Crear producto
      </Button>
    </form>
  );
}
