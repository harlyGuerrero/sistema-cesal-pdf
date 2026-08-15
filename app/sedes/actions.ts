"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Region } from "@/lib/generated/prisma/client";

// Fase B: CRUD de Sede. Todavía sin relación a Product/Activo (ver
// prisma/schema.prisma), así que a diferencia de Product no hay guard de
// "tiene historial" al eliminar.

function readSedeInput(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const city = (formData.get("city") as string).trim();
  const region = formData.get("region") as Region;

  if (!name || !city || !region) {
    throw new Error("Nombre, ciudad y región son obligatorios.");
  }

  return { name, city, region };
}

export async function createSedeAction(formData: FormData): Promise<void> {
  const data = readSedeInput(formData);

  const existing = await prisma.sede.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new Error(`Ya existe una sede llamada "${data.name}".`);
  }

  await prisma.sede.create({ data });

  revalidatePath("/sedes");
  redirect("/sedes");
}

export async function updateSedeAction(sedeId: string, formData: FormData): Promise<void> {
  const data = readSedeInput(formData);

  const existing = await prisma.sede.findUnique({ where: { name: data.name } });
  if (existing && existing.id !== sedeId) {
    throw new Error(`Ya existe una sede llamada "${data.name}".`);
  }

  await prisma.sede.update({ where: { id: sedeId }, data });

  revalidatePath(`/sedes/${sedeId}`);
  revalidatePath("/sedes");
}

export async function deleteSedeAction(sedeId: string): Promise<void> {
  await prisma.sede.delete({ where: { id: sedeId } });

  revalidatePath("/sedes");
  redirect("/sedes");
}
