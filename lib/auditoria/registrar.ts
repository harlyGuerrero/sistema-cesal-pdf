import { prisma } from "@/lib/db";
import type { Prisma, TipoAccionAuditoria } from "@/lib/generated/prisma/client";

// Fase 11: helper único invocado desde cada server action mutante, en vez de
// instrumentar cada pantalla a mano. usuarioId queda null siempre por ahora
// — no hay autenticación todavía (fuera de alcance, ver CLAUDE.md); cuando
// exista, se pasa acá sin cambiar la forma de la tabla.
//
// Recibe `client` para poder participar de la misma transacción que la
// mutación que audita (tx dentro de un $transaction) — si se pasa el
// prisma global, la auditoría se escribe fuera de esa transacción.
export async function registrarAuditoria(
  params: {
    accion: TipoAccionAuditoria;
    entidad: string;
    entidadId: string;
    detalle?: Prisma.InputJsonValue;
    usuarioId?: string | null;
  },
  client: Pick<typeof prisma, "auditoriaLog"> = prisma
): Promise<void> {
  await client.auditoriaLog.create({
    data: {
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId,
      detalle: params.detalle,
      usuarioId: params.usuarioId ?? null,
    },
  });
}
