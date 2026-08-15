"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

// Fase 8 de Activos: Usuario mínimo, sin login (fuera de alcance, ver
// CLAUDE.md) — solo para referenciar "quién" desde Movimiento/Auditoría
// cuando esas fases existan.

function readUsuarioInput(formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim();
  const email = (formData.get("email") as string | null)?.trim() || null;

  if (!nombre) {
    throw new Error("El nombre es obligatorio.");
  }

  return { nombre, email };
}

export async function createUsuarioAction(formData: FormData): Promise<void> {
  const data = readUsuarioInput(formData);

  if (data.email) {
    const existing = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error(`Ya existe un usuario con el email "${data.email}".`);
    }
  }

  await prisma.usuario.create({ data });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function updateUsuarioAction(usuarioId: string, formData: FormData): Promise<void> {
  const data = readUsuarioInput(formData);

  if (data.email) {
    const existing = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== usuarioId) {
      throw new Error(`Ya existe un usuario con el email "${data.email}".`);
    }
  }

  await prisma.usuario.update({ where: { id: usuarioId }, data });

  revalidatePath(`/usuarios/${usuarioId}`);
  revalidatePath("/usuarios");
}

export async function deleteUsuarioAction(usuarioId: string): Promise<void> {
  await prisma.usuario.delete({ where: { id: usuarioId } });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
