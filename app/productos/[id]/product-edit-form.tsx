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
import { updateProductAction } from "../actions";

export function ProductEditForm({
  productId,
  name,
  categoryId,
  categories,
}: {
  productId: string;
  name: string;
  categoryId: string;
  categories: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await updateProductAction(productId, formData);
            toast.success("Producto actualizado.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
          }
        });
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="space-y-1">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" defaultValue={name} required className="w-64" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="categoryId">Categoría</Label>
        <Select name="categoryId" defaultValue={categoryId}>
          <SelectTrigger id="categoryId" className="w-56">
            <SelectValue />
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
      <Button type="submit" disabled={isPending}>
        Guardar
      </Button>
    </form>
  );
}
