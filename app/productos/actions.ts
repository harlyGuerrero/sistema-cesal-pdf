"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalization/normalize";

// Fase 10 (pipeline PDF) + Fase 1 de Activos: creación manual / edición /
// eliminación de un Activo. Ya no deduplica por nombre+tipo — cada Activo es
// una unidad física propia, así que crear "otro Laptop Lenovo X1" es
// legítimo, no un duplicado (ver planificación de Activos, decisión
// "Product se fusiona en Activo").

export async function createProductAction(formData: FormData): Promise<void> {
  const name = (formData.get("name") as string).trim();
  const tipoActivoId = formData.get("categoryId") as string;

  if (!name || !tipoActivoId) {
    throw new Error("Nombre y tipo de activo son obligatorios.");
  }

  const nombreNormalizado = normalizeName(name);
  if (!nombreNormalizado) {
    throw new Error("Nombre inválido.");
  }

  const created = await prisma.activo.create({
    data: { nombreActivo: name, nombreNormalizado, tipoActivoId },
  });

  revalidatePath("/productos");
  redirect(`/productos/${created.id}`);
}

export async function updateProductAction(productId: string, formData: FormData): Promise<void> {
  const name = (formData.get("name") as string).trim();
  const tipoActivoId = formData.get("categoryId") as string;

  if (!name || !tipoActivoId) {
    throw new Error("Nombre y tipo de activo son obligatorios.");
  }

  const nombreNormalizado = normalizeName(name);
  if (!nombreNormalizado) {
    throw new Error("Nombre inválido.");
  }

  await prisma.activo.update({
    where: { id: productId },
    data: { nombreActivo: name, nombreNormalizado, tipoActivoId },
  });

  revalidatePath(`/productos/${productId}`);
  revalidatePath("/productos");
}

export async function deleteProductAction(productId: string): Promise<void> {
  const activo = await prisma.activo.findUniqueOrThrow({ where: { id: productId } });

  // Eliminación controlada: un activo que viene de una importación no se
  // borra — rompería la trazabilidad Activo -> ImportItem -> Import (ver
  // ARCHITECTURE.md 6, skill import-workflow).
  if (activo.importItemId) {
    throw new Error("No se puede eliminar: proviene de una importación (mantiene trazabilidad).");
  }

  await prisma.activo.delete({ where: { id: productId } });

  revalidatePath("/productos");
  redirect("/productos");
}
