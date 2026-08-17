import type { EstadoPatrimonial, Prisma } from "@/lib/generated/prisma/client";

export interface ActivosFiltrosParams {
  q?: string;
  tipoActivoId?: string;
  sedeId?: string;
  estadoPatrimonial?: string;
}

// Fase 40: extraído de app/(app)/activos/page.tsx para que la exportación a
// Excel (app/api/activos/export/route.ts) filtre exactamente igual que la
// pantalla — "exportar" siempre debe respetar lo que el usuario está viendo,
// no una copia divergente de la misma lógica.
export function buildActivosWhere(params: ActivosFiltrosParams): Prisma.ActivoWhereInput {
  const { q, tipoActivoId, sedeId, estadoPatrimonial } = params;
  return {
    ...(q
      ? {
          OR: [
            { nombreNormalizado: { contains: q, mode: "insensitive" } },
            { codigoPatrimonial: { contains: q, mode: "insensitive" } },
            { numeroFactura: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(tipoActivoId && tipoActivoId !== "all" ? { tipoActivoId } : {}),
    ...(sedeId && sedeId !== "all" ? { sedeId } : {}),
    ...(estadoPatrimonial && estadoPatrimonial !== "all"
      ? { estadoPatrimonial: estadoPatrimonial as EstadoPatrimonial }
      : {}),
  };
}
