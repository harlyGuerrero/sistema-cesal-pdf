import type { Prisma } from "@/lib/generated/prisma/client";
import { parseCentavos } from "./calculo";

// Fase 58: una vez registrado un trimestre, el costo, la fecha de
// adquisición y el tipo de activo (que decide la tasa) quedan fijos — son
// la base del historial y cambiarlos dejaría periodos calculados sobre
// datos que ya no existen. Puro para poder probarlo; lo usan la edición de
// Activo y la importación de Excel.

interface DatosBase {
  costoAdquisicion: { toString(): string } | null;
  fechaAdquisicion: Date | null;
  tipoActivoId: string;
}

// `undefined` en `nuevo` significa "no se toca" (mismo criterio que Prisma).
export function cambiosBloqueadosPorDepreciacion(
  anterior: DatosBase,
  nuevo: {
    costoAdquisicion?: number | null;
    fechaAdquisicion?: Date | null;
    tipoActivoId?: string;
  }
): string[] {
  const bloqueados: string[] = [];

  if (nuevo.costoAdquisicion !== undefined) {
    const antes = parseCentavos(anterior.costoAdquisicion);
    const despues = nuevo.costoAdquisicion === null ? null : Math.round(nuevo.costoAdquisicion * 100);
    if (antes !== despues) bloqueados.push("costo de adquisición");
  }
  if (nuevo.fechaAdquisicion !== undefined) {
    const antes = anterior.fechaAdquisicion?.getTime() ?? null;
    const despues = nuevo.fechaAdquisicion?.getTime() ?? null;
    if (antes !== despues) bloqueados.push("fecha de adquisición");
  }
  if (nuevo.tipoActivoId !== undefined && nuevo.tipoActivoId !== anterior.tipoActivoId) {
    bloqueados.push("tipo de activo");
  }

  return bloqueados;
}

export function mensajeCambiosBloqueados(bloqueados: string[]): string {
  return `No se puede cambiar ${bloqueados.join(", ")}: el activo ya tiene depreciación registrada.`;
}

// Defensa dentro de la transacción que modifica el Activo: relee si tiene
// periodos registrados en ese momento (no confía en lo que vio la pantalla).
export async function assertSinCambiosDepreciables(
  tx: Prisma.TransactionClient,
  anterior: DatosBase & { id: string },
  nuevo: Parameters<typeof cambiosBloqueadosPorDepreciacion>[1]
): Promise<void> {
  const bloqueados = cambiosBloqueadosPorDepreciacion(anterior, nuevo);
  if (bloqueados.length === 0) return;
  const periodos = await tx.depreciacionPeriodo.count({ where: { activoId: anterior.id } });
  if (periodos > 0) throw new Error(mensajeCambiosBloqueados(bloqueados));
}
