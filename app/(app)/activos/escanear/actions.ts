"use server";

import { prisma } from "@/lib/db";
import { requireSessionUsuario } from "@/lib/auth/session";
import type { EstadoPatrimonial } from "@/lib/generated/prisma/client";

export interface ActivoEscaneado {
  id: string;
  codigoPatrimonial: string;
  nombreActivo: string;
  sede: string | null;
  estadoPatrimonial: EstadoPatrimonial;
}

const MAX_CODIGOS = 500;

// Fase 67: datos para la lista de escaneados de /activos/escanear. La lista
// guarda solo códigos (ver lib/activos/registro-escaneos.ts); el nombre, la
// sede y el estado se leen al mostrarla, así siempre están al día.
export async function buscarActivosEscaneadosAction(codigos: string[]): Promise<ActivoEscaneado[]> {
  await requireSessionUsuario();
  const unicos = [...new Set(codigos.filter((codigo) => typeof codigo === "string"))].slice(0, MAX_CODIGOS);
  if (unicos.length === 0) return [];

  const activos = await prisma.activo.findMany({
    where: { codigoPatrimonial: { in: unicos } },
    select: {
      id: true,
      codigoPatrimonial: true,
      nombreActivo: true,
      estadoPatrimonial: true,
      sede: { select: { name: true } },
    },
  });
  return activos.map((activo) => ({
    id: activo.id,
    codigoPatrimonial: activo.codigoPatrimonial,
    nombreActivo: activo.nombreActivo,
    sede: activo.sede?.name ?? null,
    estadoPatrimonial: activo.estadoPatrimonial,
  }));
}
