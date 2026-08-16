import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalization/normalize";
import { generarCodigosPatrimoniales } from "@/lib/activos/codigo-patrimonial";
import type { Prisma } from "@/lib/generated/prisma/client";

// Cantidad fraccionaria, cero o ausente -> 1 unidad física. No hay forma de
// repartir "2.5 kg" en unidades individuales; se trata como una sola.
export function quantityToUnitCount(quantity: number | null): number {
  if (quantity === null || !Number.isFinite(quantity) || quantity <= 0) return 1;
  return Math.max(1, Math.round(quantity));
}

// Confirmar una fila de importación ya no busca ni reutiliza un Activo
// existente (antes findOrCreateProduct deduplicaba por normalizedName +
// categoryId) — cada unidad física confirmada es su propia fila, porque un
// Activo patrimonial necesita su propio código, ubicación y responsable.
// quantity > 1 desdobla la fila en N activos independientes (ver
// planificación de Activos, decisión "Product se fusiona en Activo").
//
// Recibe `tx` (no el cliente global) porque generarCodigosPatrimoniales
// reserva el correlativo con una sentencia atómica que debe correr en la
// misma transacción que el createMany subsiguiente — así, si el createMany
// falla, la reserva de números se revierte con el resto en vez de dejar un
// hueco fantasma en el contador (ver lib/activos/codigo-patrimonial.ts).
export async function buildActivoRows(
  tx: Prisma.TransactionClient,
  params: {
    importItemId: string;
    tipoActivoId: string;
    nombreActivo: string;
    quantity: number | null;
    unitPrice: number | null;
  }
): Promise<Prisma.ActivoCreateManyInput[]> {
  const nombreNormalizado = normalizeName(params.nombreActivo) ?? params.nombreActivo;
  const unidades = quantityToUnitCount(params.quantity);

  const tipoActivo = await tx.tipoActivo.findUniqueOrThrow({ where: { id: params.tipoActivoId } });
  const codigos = await generarCodigosPatrimoniales(tx, {
    tipoActivoCode: tipoActivo.code,
    nombreActivo: params.nombreActivo,
    cantidad: unidades,
  });

  return codigos.map((codigoPatrimonial) => ({
    tipoActivoId: params.tipoActivoId,
    nombreActivo: params.nombreActivo,
    nombreNormalizado,
    codigoPatrimonial,
    costoAdquisicion: params.unitPrice ?? undefined,
    importItemId: params.importItemId,
  }));
}

export async function createActivosFromImportItem(params: {
  importItemId: string;
  tipoActivoId: string;
  nombreActivo: string;
  quantity: number | null;
  unitPrice: number | null;
}): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const rows = await buildActivoRows(tx, params);
    const { count } = await tx.activo.createMany({ data: rows });
    return count;
  });
}
