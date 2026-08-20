import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalization/normalize";
import { generarCodigosPatrimoniales } from "@/lib/activos/codigo-patrimonial";
import { buildMovimientoDeAlta } from "@/lib/activos/movimientos";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
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
    numeroFactura?: string | null;
    numeroFC?: string | null;
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
    numeroFactura: params.numeroFactura ?? undefined,
    numeroFC: params.numeroFC ?? undefined,
    importItemId: params.importItemId,
  }));
}

// Fase 39: motivo del Movimiento(ALTA) de un Activo confirmado desde un PDF
// (ver createActivosFromImportItem, abajo) — toda confirmación es manual,
// no hay más un camino de auto-confirmación por regla que necesite
// distinguirse acá.
export function motivoAltaPorImportacion(numeroFactura: string | null): string {
  const base = "Alta por importación de PDF";
  return numeroFactura ? `${base} (factura ${numeroFactura})` : base;
}

export async function createActivosFromImportItem(params: {
  importItemId: string;
  tipoActivoId: string;
  nombreActivo: string;
  quantity: number | null;
  unitPrice: number | null;
  numeroFactura?: string | null;
  numeroFC?: string | null;
  usuarioId: string;
}): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const rows = await buildActivoRows(tx, params);
    const created = await tx.activo.createManyAndReturn({ data: rows });

    // Fase 39: cada unidad física confirmada desde un PDF también queda de
    // alta en su historial de Movimientos (mismo helper que usa el alta
    // manual, ver app/(app)/activos/actions.ts) — antes esta ruta era la
    // única forma de crear un Activo que no dejaba rastro en /movimientos.
    const motivo = motivoAltaPorImportacion(params.numeroFactura ?? null);
    await tx.movimiento.createMany({
      data: created.map((activo) => ({
        activoId: activo.id,
        usuarioId: params.usuarioId,
        ...buildMovimientoDeAlta(activo, motivo),
      })),
    });

    // Fase 41: mismo AuditoriaLog(DAR_DE_ALTA) que el alta manual y la
    // importación por Excel (ver excel-import.ts) — esta ruta se había
    // quedado afuera al agregar el Movimiento en Fase 39, así que un activo
    // confirmado desde un PDF no aparecía en /auditoria.
    for (const activo of created) {
      await registrarAuditoria(
        {
          accion: "DAR_DE_ALTA",
          entidad: "Activo",
          entidadId: activo.id,
          detalle: { nombreActivo: activo.nombreActivo, codigoPatrimonial: activo.codigoPatrimonial, origen: "pdf" },
          usuarioId: params.usuarioId,
        },
        tx
      );
    }

    return created.length;
  });
}
