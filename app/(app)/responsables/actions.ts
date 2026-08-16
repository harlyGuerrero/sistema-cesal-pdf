"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { requireSessionUsuario } from "@/lib/auth/session";

// Fase 8 de Activos: Responsable es la persona a la que se puede asignar un
// Activo — no implica acceso al sistema (ver Usuario).

function readResponsableInput(formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() || "";
  const documento = (formData.get("documento") as string | null)?.trim() || null;
  const cargo = (formData.get("cargo") as string | null)?.trim() || null;
  const sedeId = (formData.get("sedeId") as string | null) || null;

  if (!nombre) {
    throw new Error("El nombre es obligatorio.");
  }
  if (!email || !email.includes("@")) {
    throw new Error("El correo es obligatorio y debe ser válido.");
  }

  return { nombre, email, documento, cargo, sedeId };
}

async function assertEmailDisponible(email: string, exceptId?: string): Promise<void> {
  const existing = await prisma.responsable.findUnique({ where: { email } });
  if (existing && existing.id !== exceptId) {
    throw new Error(`Ya existe un responsable con el correo "${email}".`);
  }
}

export async function createResponsableAction(formData: FormData): Promise<void> {
  const actor = await requireSessionUsuario();
  const data = readResponsableInput(formData);
  await assertEmailDisponible(data.email);

  await prisma.$transaction(async (tx) => {
    const responsable = await tx.responsable.create({ data });
    await registrarAuditoria(
      {
        accion: "CREAR",
        entidad: "Responsable",
        entidadId: responsable.id,
        detalle: { nombre: responsable.nombre },
        usuarioId: actor.id,
      },
      tx
    );
  });

  revalidatePath("/responsables");
  redirect("/responsables");
}

export async function updateResponsableAction(responsableId: string, formData: FormData): Promise<void> {
  const actor = await requireSessionUsuario();
  const data = readResponsableInput(formData);
  await assertEmailDisponible(data.email, responsableId);

  await prisma.$transaction(async (tx) => {
    await tx.responsable.update({ where: { id: responsableId }, data });
    await registrarAuditoria(
      {
        accion: "ACTUALIZAR",
        entidad: "Responsable",
        entidadId: responsableId,
        detalle: { nombre: data.nombre },
        usuarioId: actor.id,
      },
      tx
    );
  });

  revalidatePath(`/responsables/${responsableId}`);
  revalidatePath("/responsables");
}

export async function deleteResponsableAction(responsableId: string): Promise<void> {
  const actor = await requireSessionUsuario();
  const responsable = await prisma.responsable.findUniqueOrThrow({
    where: { id: responsableId },
    include: { _count: { select: { activos: true } } },
  });

  // Eliminación controlada: si tiene activos asignados hay que desasignarlos
  // primero (ver desasignarResponsableAction en app/activos/actions.ts).
  if (responsable._count.activos > 0) {
    throw new Error("No se puede eliminar: tiene activos asignados.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.responsable.delete({ where: { id: responsableId } });
    await registrarAuditoria(
      {
        accion: "ELIMINAR",
        entidad: "Responsable",
        entidadId: responsableId,
        detalle: { nombre: responsable.nombre },
        usuarioId: actor.id,
      },
      tx
    );
  });

  revalidatePath("/responsables");
  redirect("/responsables");
}
