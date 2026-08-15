import type {
  Activo,
  EstadoPatrimonial,
  Prisma,
  TipoAccionAuditoria,
  TipoMovimiento,
} from "@/lib/generated/prisma/client";

type UbicacionSnapshot = Pick<Activo, "sedeId" | "unidadOperativaId" | "ambienteId" | "estadoPatrimonial">;

// Fase 9 de Activos: Movimiento no tiene CRUD propio — se infiere como
// efecto de editar un Activo. Compara el estado anterior contra los datos
// nuevos y decide, en orden de precedencia, cuál es la razón principal del
// cambio (baja/reactivación pesan más que un simple cambio de ubicación),
// sin perder ningún snapshot: todos los campos "antes/después" se guardan
// siempre, aunque tipo solo etiquete el más relevante.
//
// Estilo "unchecked" (IDs escalares, no {connect}) a propósito: se combina
// con activoId escalar en el mismo tx.movimiento.create({ data: { activoId, ...movimiento } }).
export function buildMovimientoDeEdicion(
  anterior: UbicacionSnapshot,
  nuevo: UbicacionSnapshot
): Omit<Prisma.MovimientoUncheckedCreateInput, "activoId"> | null {
  const ubicacionCambio =
    anterior.sedeId !== nuevo.sedeId ||
    anterior.unidadOperativaId !== nuevo.unidadOperativaId ||
    anterior.ambienteId !== nuevo.ambienteId;
  const estadoCambio = anterior.estadoPatrimonial !== nuevo.estadoPatrimonial;

  if (!ubicacionCambio && !estadoCambio) return null;

  const tipo = inferirTipoDeEdicion(anterior, nuevo, ubicacionCambio);

  return {
    tipo,
    sedeAnteriorId: anterior.sedeId,
    sedeNuevaId: nuevo.sedeId,
    unidadOperativaAnteriorId: anterior.unidadOperativaId,
    unidadOperativaNuevaId: nuevo.unidadOperativaId,
    ambienteAnteriorId: anterior.ambienteId,
    ambienteNuevoId: nuevo.ambienteId,
    estadoAnterior: anterior.estadoPatrimonial,
    estadoNuevo: nuevo.estadoPatrimonial,
  };
}

function inferirTipoDeEdicion(
  anterior: UbicacionSnapshot,
  nuevo: UbicacionSnapshot,
  ubicacionCambio: boolean
): TipoMovimiento {
  if (nuevo.estadoPatrimonial === "BAJA" && anterior.estadoPatrimonial !== "BAJA") return "BAJA";
  if (anterior.estadoPatrimonial === "BAJA" && nuevo.estadoPatrimonial !== "BAJA") return "REACTIVACION";
  if (nuevo.estadoPatrimonial === "MANTENIMIENTO" && anterior.estadoPatrimonial !== "MANTENIMIENTO") {
    return "MANTENIMIENTO";
  }
  if (anterior.estadoPatrimonial === "MANTENIMIENTO" && nuevo.estadoPatrimonial !== "MANTENIMIENTO") {
    return "RETORNO_MANTENIMIENTO";
  }
  if (anterior.sedeId !== nuevo.sedeId) return "TRANSFERENCIA";
  if (ubicacionCambio) return "CAMBIO_UBICACION";
  // Único caso restante: solo cambió estadoPatrimonial entre valores que no
  // son BAJA/MANTENIMIENTO en ninguno de los dos lados (ej. DISPONIBLE <-> ASIGNADO
  // fuera del flujo de asignarResponsableAction) — se registra igual, sin
  // inventar un tipo más específico que no aplique.
  return "CAMBIO_UBICACION";
}

// Fase 11: reusa la misma inferencia que ya hace Movimiento para decidir qué
// TipoAccionAuditoria corresponde a una edición de Activo — evita tener dos
// lógicas de "qué fue lo importante que cambió" divergentes.
export function movimientoTipoAAccionAuditoria(tipo: TipoMovimiento | null): TipoAccionAuditoria {
  if (tipo === "BAJA") return "DAR_DE_BAJA";
  if (tipo === "TRANSFERENCIA") return "TRANSFERIR";
  return "ACTUALIZAR";
}

export function buildMovimientoDeAlta(activo: {
  sedeId: string | null;
  unidadOperativaId: string | null;
  ambienteId: string | null;
  estadoPatrimonial: EstadoPatrimonial;
}): Omit<Prisma.MovimientoUncheckedCreateInput, "activoId"> {
  return {
    tipo: "ALTA",
    sedeNuevaId: activo.sedeId,
    unidadOperativaNuevaId: activo.unidadOperativaId,
    ambienteNuevoId: activo.ambienteId,
    estadoNuevo: activo.estadoPatrimonial,
    motivo: "Alta del activo",
  };
}
