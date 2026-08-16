"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createActivosFromImportItem } from "@/lib/import-workflow/activo-creation";

// Acciones de revisión humana (Fase 9). A diferencia de Fase 8 (auto-confirma
// solo cuando method === "RULE"), estas siempre llevan reviewedAt — alguien
// las ejecutó. reviewedBy queda null hasta que exista autenticación (fuera de
// alcance, ver CLAUDE.md).
//
// Confirmar ya no busca ni reutiliza un Activo existente: crea uno por
// unidad física (ver lib/import-workflow/activo-creation.ts).

export async function updateNumeroFacturaAction(importId: string, formData: FormData): Promise<void> {
  const numeroFactura = (formData.get("numeroFactura") as string | null)?.trim() || null;

  await prisma.import.update({
    where: { id: importId },
    data: { numeroFactura },
  });

  revalidatePath(`/importaciones/${importId}`);
  revalidatePath("/importaciones");
}

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
  const item = await prisma.importItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { import: { select: { numeroFactura: true } } },
  });

  if (!item.tipoActivoId || !item.normalizedName) {
    throw new Error("El ítem necesita nombre y tipo de activo antes de poder confirmarse — usa Editar.");
  }

  await createActivosFromImportItem({
    importItemId: itemId,
    tipoActivoId: item.tipoActivoId,
    nombreActivo: item.normalizedName,
    quantity: item.quantity !== null ? Number(item.quantity) : null,
    unitPrice: item.unitPrice !== null ? Number(item.unitPrice) : null,
    numeroFactura: item.import.numeroFactura,
  });

  await prisma.importItem.update({
    where: { id: itemId },
    data: { status: "CONFIRMED", reviewedAt: new Date() },
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
  const tipoActivoId = formData.get("categoryId") as string;
  const quantityRaw = formData.get("quantity") as string;
  const unitPriceRaw = formData.get("unitPrice") as string;
  const totalPriceRaw = formData.get("totalPrice") as string;

  if (!name || !tipoActivoId) {
    throw new Error("Nombre y tipo de activo son obligatorios.");
  }

  const quantity = quantityRaw ? Number(quantityRaw) : null;
  const unitPrice = unitPriceRaw ? Number(unitPriceRaw) : null;
  const totalPrice = totalPriceRaw ? Number(totalPriceRaw) : null;

  const item = await prisma.importItem.update({
    where: { id: itemId },
    data: {
      normalizedName: name,
      tipoActivoId,
      categoryMethod: "MANUAL",
      categoryConfidence: 1,
      quantity,
      unitPrice,
      totalPrice,
      status: "CONFIRMED",
      reviewedAt: new Date(),
    },
    include: { import: { select: { numeroFactura: true } } },
  });

  await createActivosFromImportItem({
    importItemId: itemId,
    tipoActivoId,
    nombreActivo: name,
    quantity,
    unitPrice,
    numeroFactura: item.import.numeroFactura,
  });

  await completeImportIfNoPending(item.importId);
  revalidatePath(`/importaciones/${item.importId}`);
}
