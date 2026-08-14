"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalization/normalize";
import { findOrCreateProduct } from "@/lib/import-workflow/product-matching";

// Fase 10: creación manual / edición / eliminación controlada de Product.
// Reutiliza findOrCreateProduct (Fase 9) y normalizeName (Fase 5) — no
// duplicar la lógica de "no duplicar productos lógicos" en un tercer lugar.

export async function createProductAction(formData: FormData): Promise<void> {
  const name = (formData.get("name") as string).trim();
  const categoryId = formData.get("categoryId") as string;

  if (!name || !categoryId) {
    throw new Error("Nombre y categoría son obligatorios.");
  }

  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    throw new Error("Nombre inválido.");
  }

  const existing = await prisma.product.findFirst({ where: { categoryId, normalizedName } });
  const productId = await findOrCreateProduct({ categoryId, normalizedName, displayName: name });

  revalidatePath("/productos");
  redirect(`/productos/${productId}${existing ? "?duplicate=1" : ""}`);
}

export async function updateProductAction(productId: string, formData: FormData): Promise<void> {
  const name = (formData.get("name") as string).trim();
  const categoryId = formData.get("categoryId") as string;

  if (!name || !categoryId) {
    throw new Error("Nombre y categoría son obligatorios.");
  }

  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    throw new Error("Nombre inválido.");
  }

  await prisma.product.update({
    where: { id: productId },
    data: { name, normalizedName, categoryId },
  });

  revalidatePath(`/productos/${productId}`);
  revalidatePath("/productos");
}

export async function deleteProductAction(productId: string): Promise<void> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { _count: { select: { importItems: true } } },
  });

  // Eliminación controlada: un producto con historial de importaciones no se
  // borra — rompería la trazabilidad Product <- ImportItem <- Import (ver
  // ARCHITECTURE.md 6, skill import-workflow).
  if (product._count.importItems > 0) {
    throw new Error(
      `No se puede eliminar: tiene ${product._count.importItems} importación(es) asociada(s).`
    );
  }

  await prisma.product.delete({ where: { id: productId } });

  revalidatePath("/productos");
  redirect("/productos");
}
