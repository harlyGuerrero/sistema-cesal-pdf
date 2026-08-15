"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

// Fase 8 de Activos: Responsable es la persona a la que se puede asignar un
// Activo — no implica acceso al sistema (ver Usuario).

function readResponsableInput(formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim();
  const documento = (formData.get("documento") as string | null)?.trim() || null;
  const cargo = (formData.get("cargo") as string | null)?.trim() || null;
  const sedeId = (formData.get("sedeId") as string | null) || null;

  if (!nombre) {
    throw new Error("El nombre es obligatorio.");
  }

  return { nombre, documento, cargo, sedeId };
}

export async function createResponsableAction(formData: FormData): Promise<void> {
  const data = readResponsableInput(formData);

  await prisma.responsable.create({ data });

  revalidatePath("/responsables");
  redirect("/responsables");
}

export async function updateResponsableAction(responsableId: string, formData: FormData): Promise<void> {
  const data = readResponsableInput(formData);

  await prisma.responsable.update({ where: { id: responsableId }, data });

  revalidatePath(`/responsables/${responsableId}`);
  revalidatePath("/responsables");
}

export async function deleteResponsableAction(responsableId: string): Promise<void> {
  const responsable = await prisma.responsable.findUniqueOrThrow({
    where: { id: responsableId },
    include: { _count: { select: { activos: true } } },
  });

  // Eliminación controlada: si tiene activos asignados hay que desasignarlos
  // primero (ver desasignarResponsableAction en app/activos/actions.ts).
  if (responsable._count.activos > 0) {
    throw new Error("No se puede eliminar: tiene activos asignados.");
  }

  await prisma.responsable.delete({ where: { id: responsableId } });

  revalidatePath("/responsables");
  redirect("/responsables");
}
