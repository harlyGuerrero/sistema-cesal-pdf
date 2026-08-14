"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { findOrCreateProduct } from "@/lib/import-workflow/product-matching";

// Acciones de revisión humana (Fase 9). A diferencia de Fase 8 (auto-confirma
// solo cuando method === "RULE"), estas siempre llevan reviewedAt — alguien
// las ejecutó. reviewedBy queda null hasta que exista autenticación (fuera de
// alcance, ver CLAUDE.md).

async function completeImportIfNoPending(importId: string): Promise<void> {
  const pending = await prisma.importItem.count({
    where: { importId, status: "REVIEW_REQUIRED" },
  });
  if (pending === 0) {
    await prisma.import.updateMany({
      where: { id: importId, status: "READY_FOR_REVIEW" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
}

export async function confirmItemAction(itemId: string): Promise<void> {
  const item = await prisma.importItem.findUniqueOrThrow({ where: { id: itemId } });

  if (!item.categoryId || !item.normalizedName) {
    throw new Error("El ítem necesita nombre y categoría antes de poder confirmarse — usa Editar.");
  }

  const productId = await findOrCreateProduct({
    categoryId: item.categoryId,
    normalizedName: item.normalizedName,
    displayName: item.normalizedName,
  });

  await prisma.importItem.update({
    where: { id: itemId },
    data: { status: "CONFIRMED", productId, reviewedAt: new Date() },
  });

  await completeImportIfNoPending(item.importId);
  revalidatePath(`/importaciones/${item.importId}`);
}

export async function rejectItemAction(itemId: string, formData: FormData): Promise<void> {
  const reviewNotes = (formData.get("reviewNotes") as string | null)?.trim() || null;

  const item = await prisma.importItem.update({
    where: { id: itemId },
    data: { status: "REJECTED", reviewNotes, reviewedAt: new Date() },
  });

  await completeImportIfNoPending(item.importId);
  revalidatePath(`/importaciones/${item.importId}`);
}

export async function editAndConfirmItemAction(itemId: string, formData: FormData): Promise<void> {
  const name = (formData.get("name") as string).trim();
  const categoryId = formData.get("categoryId") as string;
  const quantityRaw = formData.get("quantity") as string;
  const unitPriceRaw = formData.get("unitPrice") as string;
  const totalPriceRaw = formData.get("totalPrice") as string;

  if (!name || !categoryId) {
    throw new Error("Nombre y categoría son obligatorios.");
  }

  const quantity = quantityRaw ? Number(quantityRaw) : null;
  const unitPrice = unitPriceRaw ? Number(unitPriceRaw) : null;
  const totalPrice = totalPriceRaw ? Number(totalPriceRaw) : null;

  const productId = await findOrCreateProduct({
    categoryId,
    normalizedName: name,
    displayName: name,
  });

  const item = await prisma.importItem.update({
    where: { id: itemId },
    data: {
      normalizedName: name,
      categoryId,
      categoryMethod: "MANUAL",
      categoryConfidence: 1,
      quantity,
      unitPrice,
      totalPrice,
      status: "CONFIRMED",
      productId,
      reviewedAt: new Date(),
    },
  });

  await completeImportIfNoPending(item.importId);
  revalidatePath(`/importaciones/${item.importId}`);
}
