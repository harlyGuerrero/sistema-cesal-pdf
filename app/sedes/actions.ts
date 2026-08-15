"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Region } from "@/lib/generated/prisma/client";

// Fase 5 de Activos: CRUD de Sede/UnidadOperativa/Ambiente. UnidadOperativa
// y Ambiente no redirigen — viven anidados en la pantalla de detalle de su
// Sede, revalidatePath alcanza para refrescar la lista ahí mismo.

function readSedeInput(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const region = formData.get("region") as Region;

  if (!name || !region) {
    throw new Error("Nombre y región son obligatorios.");
  }

  return { name, region };
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
  const sede = await prisma.sede.findUniqueOrThrow({
    where: { id: sedeId },
    include: { _count: { select: { unidadesOperativas: true, ambientes: true } } },
  });

  // Eliminación controlada: una sede con unidades operativas o ambientes no
  // se borra — hay que vaciarla primero (protege la jerarquía Zona -> Sede ->
  // Unidad Operativa -> Ambiente, ver planificación de Activos Fase 5).
  if (sede._count.unidadesOperativas > 0 || sede._count.ambientes > 0) {
    throw new Error("No se puede eliminar: tiene unidades operativas o ambientes asociados.");
  }

  await prisma.sede.delete({ where: { id: sedeId } });

  revalidatePath("/sedes");
  redirect("/sedes");
}

export async function createUnidadOperativaAction(sedeId: string, formData: FormData): Promise<void> {
  const name = (formData.get("name") as string).trim();
  if (!name) {
    throw new Error("El nombre es obligatorio.");
  }

  const existing = await prisma.unidadOperativa.findUnique({
    where: { sedeId_name: { sedeId, name } },
  });
  if (existing) {
    throw new Error(`Ya existe una unidad operativa llamada "${name}" en esta sede.`);
  }

  await prisma.unidadOperativa.create({ data: { sedeId, name } });

  revalidatePath(`/sedes/${sedeId}`);
}

export async function deleteUnidadOperativaAction(unidadId: string): Promise<void> {
  const unidad = await prisma.unidadOperativa.findUniqueOrThrow({
    where: { id: unidadId },
    include: { _count: { select: { ambientes: true } } },
  });

  if (unidad._count.ambientes > 0) {
    throw new Error("No se puede eliminar: tiene ambientes asociados.");
  }

  await prisma.unidadOperativa.delete({ where: { id: unidadId } });

  revalidatePath(`/sedes/${unidad.sedeId}`);
}

export async function createAmbienteAction(sedeId: string, formData: FormData): Promise<void> {
  const name = (formData.get("name") as string).trim();
  const unidadOperativaId = (formData.get("unidadOperativaId") as string) || null;

  if (!name) {
    throw new Error("El nombre es obligatorio.");
  }

  // unidadOperativaId es opcional, pero si viene debe pertenecer a esta
  // misma sede — Prisma no lo expresa como FK compuesta (ver schema.prisma).
  if (unidadOperativaId) {
    const unidad = await prisma.unidadOperativa.findUnique({ where: { id: unidadOperativaId } });
    if (!unidad || unidad.sedeId !== sedeId) {
      throw new Error("La unidad operativa seleccionada no pertenece a esta sede.");
    }
  }

  await prisma.ambiente.create({ data: { sedeId, unidadOperativaId, name } });

  revalidatePath(`/sedes/${sedeId}`);
}

export async function deleteAmbienteAction(ambienteId: string): Promise<void> {
  const ambiente = await prisma.ambiente.delete({ where: { id: ambienteId } });

  revalidatePath(`/sedes/${ambiente.sedeId}`);
}
