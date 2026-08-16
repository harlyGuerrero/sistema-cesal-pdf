"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { requireSuperAdmin } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import type { RolUsuario } from "@/lib/generated/prisma/client";

// Fase 13: Usuario ahora es una cuenta real (email + contraseña + rol) — ver
// CLAUDE.md para el límite exacto entre SUPER_ADMIN y ADMIN. Solo un
// SUPER_ADMIN puede gestionar Usuario; lo exige requireSuperAdmin() acá
// además de proxy.ts (defensa en profundidad, ver comentario en proxy.ts).

function readRol(formData: FormData): RolUsuario {
  const raw = formData.get("rol") as string | null;
  return raw === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
}

// Invariante: siempre debe quedar al menos un SUPER_ADMIN activo, o nadie
// podría volver a gestionar Usuario (ni siquiera para revertir el error).
async function assertQuedaUnSuperAdminActivo(
  tx: Pick<typeof prisma, "usuario">,
  usuarioId: string,
  seguiraSiendoSuperAdminActivo: boolean
): Promise<void> {
  if (seguiraSiendoSuperAdminActivo) return;
  const otros = await tx.usuario.count({
    where: { id: { not: usuarioId }, rol: "SUPER_ADMIN", estado: true },
  });
  if (otros === 0) {
    throw new Error("Debe quedar al menos un Super Administrador activo.");
  }
}

export async function createUsuarioAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin();

  const nombre = (formData.get("nombre") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const rol = readRol(formData);

  if (!nombre || !email) {
    throw new Error("Nombre y email son obligatorios.");
  }
  if (!password || password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`Ya existe un usuario con el email "${email}".`);
  }

  const passwordHash = await hashPassword(password);

  const usuario = await prisma.$transaction(async (tx) => {
    const created = await tx.usuario.create({ data: { nombre, email, passwordHash, rol } });
    await registrarAuditoria(
      { accion: "CREAR", entidad: "Usuario", entidadId: created.id, detalle: { nombre, email, rol }, usuarioId: actor.id },
      tx
    );
    return created;
  });

  revalidatePath("/usuarios");
  redirect(`/usuarios/${usuario.id}`);
}

export async function updateUsuarioAction(usuarioId: string, formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin();
  const esUsuarioActual = actor.id === usuarioId;

  const current = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });

  const nombre = (formData.get("nombre") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = (formData.get("password") as string | null) || "";
  const rolRaw = formData.get("rol") as string | null;
  const estadoRaw = formData.get("estado") as string | null;

  // El formulario no renderiza rol/estado cuando editás tu propia cuenta
  // (ver usuario-edit-form.tsx) — si igual llegan acá, es un intento de
  // saltarse esa restricción (ej. request armado a mano), no un valor real.
  if (esUsuarioActual && (rolRaw !== null || estadoRaw !== null)) {
    throw new Error("No puedes cambiar tu propio rol o estado.");
  }

  const rol: RolUsuario = esUsuarioActual ? current.rol : readRol(formData);
  const estado = esUsuarioActual ? current.estado : estadoRaw === "true";

  if (!nombre || !email) {
    throw new Error("Nombre y email son obligatorios.");
  }
  if (password && password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing && existing.id !== usuarioId) {
    throw new Error(`Ya existe un usuario con el email "${email}".`);
  }

  await prisma.$transaction(async (tx) => {
    await assertQuedaUnSuperAdminActivo(tx, usuarioId, rol === "SUPER_ADMIN" && estado);

    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        nombre,
        email,
        rol,
        estado,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    });
    await registrarAuditoria(
      { accion: "ACTUALIZAR", entidad: "Usuario", entidadId: usuarioId, detalle: { nombre, email, rol, estado }, usuarioId: actor.id },
      tx
    );
  });

  revalidatePath(`/usuarios/${usuarioId}`);
  revalidatePath("/usuarios");
}

export async function deleteUsuarioAction(usuarioId: string): Promise<void> {
  const actor = await requireSuperAdmin();

  if (actor.id === usuarioId) {
    throw new Error("No puedes eliminar tu propia cuenta.");
  }

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });

  await prisma.$transaction(async (tx) => {
    await assertQuedaUnSuperAdminActivo(tx, usuarioId, false);

    await tx.usuario.delete({ where: { id: usuarioId } });
    await registrarAuditoria(
      { accion: "ELIMINAR", entidad: "Usuario", entidadId: usuarioId, detalle: { nombre: usuario.nombre, email: usuario.email }, usuarioId: actor.id },
      tx
    );
  });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
