"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSessionUsuario } from "@/lib/auth/session";

// Fase 49: ambas acciones filtran siempre por usuarioId = actor.id además
// del id de la notificación — nunca confiar en que el id que llega del
// cliente ya es del usuario correcto (evita que alguien marque como leída
// una notificación ajena cambiando el id a mano).

export async function marcarLeidaAction(notificacionId: string): Promise<void> {
  const actor = await requireSessionUsuario();

  await prisma.notificacion.updateMany({
    where: { id: notificacionId, usuarioId: actor.id, leida: false },
    data: { leida: true, leidaEn: new Date() },
  });

  revalidatePath("/notificaciones");
}

export async function marcarTodasLeidasAction(): Promise<void> {
  const actor = await requireSessionUsuario();

  await prisma.notificacion.updateMany({
    where: { usuarioId: actor.id, leida: false },
    data: { leida: true, leidaEn: new Date() },
  });

  revalidatePath("/notificaciones");
}
