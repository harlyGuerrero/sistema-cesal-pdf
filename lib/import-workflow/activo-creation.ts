import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalization/normalize";
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
export function buildActivoRows(params: {
  importItemId: string;
  tipoActivoId: string;
  nombreActivo: string;
  quantity: number | null;
  unitPrice: number | null;
}): Prisma.ActivoCreateManyInput[] {
  const nombreNormalizado = normalizeName(params.nombreActivo) ?? params.nombreActivo;
  const unidades = quantityToUnitCount(params.quantity);

  return Array.from({ length: unidades }, () => ({
    tipoActivoId: params.tipoActivoId,
    nombreActivo: params.nombreActivo,
    nombreNormalizado,
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
  const { count } = await prisma.activo.createMany({ data: buildActivoRows(params) });
  return count;
}
