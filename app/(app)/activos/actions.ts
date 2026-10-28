"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalization/normalize";
import { readEspecificaciones } from "@/lib/activos/especificaciones";
import { generarCodigoPatrimonial } from "@/lib/activos/codigo-patrimonial";
import {
  buildMovimientoDeAlta,
  buildMovimientoDeEdicion,
  movimientoTipoAAccionAuditoria,
} from "@/lib/activos/movimientos";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { archivarDocumentosActivo } from "@/lib/documentos/storage";
import { aActivoEliminable, CONTEO_ELIMINACION, motivoNoEliminable, puedeEliminarActivos } from "@/lib/activos/eliminacion";
import { assertSinCambiosDepreciables } from "@/lib/depreciacion/proteccion";
import { sincronizarValoresContables } from "@/lib/depreciacion/valores-contables";
import { crearNotificacionDesdeMovimiento } from "@/lib/notificaciones/crear";
import { requireSessionUsuario } from "@/lib/auth/session";
import { nombreCompleto } from "@/lib/nombre-completo";
import { MOTIVO_BAJA_LABELS } from "@/lib/activos/labels";
import type { CondicionFisica, EstadoPatrimonial, MotivoBaja } from "@/lib/generated/prisma/client";

// Fase 6 de Activos: alta/edición/eliminación de Activo, integrando la
// ubicación (Fase 5) y los campos dinámicos de su subcategoría (Fase 4).
// Fase 61: la subcategoría pasa a ser opcional, así que tipoActivoId se
// recibe del formulario. Si además viene una subcategoría, debe pertenecer a
// ese tipo (ver schema.prisma, comentario en Activo).

function parseDecimal(formData: FormData, key: string, label: string): number | null {
  const raw = (formData.get(key) as string | null)?.trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`"${label}" debe ser un número mayor o igual a 0.`);
  }
  return value;
}

async function resolveProveedorId(formData: FormData): Promise<string | null> {
  const razonSocial = (formData.get("proveedorRazonSocial") as string | null)?.trim();
  if (!razonSocial) return null;

  const proveedor = await prisma.proveedor.upsert({
    where: { razonSocial },
    update: {},
    create: { razonSocial },
  });
  return proveedor.id;
}

async function resolveUbicacion(
  formData: FormData
): Promise<{ sedeId: string; unidadOperativaId: string | null; ambienteId: string | null }> {
  const sedeId = formData.get("sedeId") as string;
  const unidadOperativaId = (formData.get("unidadOperativaId") as string | null) || null;
  const ambienteId = (formData.get("ambienteId") as string | null) || null;

  if (!sedeId) throw new Error("La sede es obligatoria.");

  if (unidadOperativaId) {
    const unidad = await prisma.unidadOperativa.findUnique({ where: { id: unidadOperativaId } });
    if (!unidad || unidad.sedeId !== sedeId) {
      throw new Error("La unidad operativa seleccionada no pertenece a la sede elegida.");
    }
  }
  if (ambienteId) {
    const ambiente = await prisma.ambiente.findUnique({ where: { id: ambienteId } });
    if (!ambiente || ambiente.sedeId !== sedeId) {
      throw new Error("El ambiente seleccionado no pertenece a la sede elegida.");
    }
  }

  return { sedeId, unidadOperativaId, ambienteId };
}

async function readActivoInput(formData: FormData) {
  const nombreActivo = (formData.get("nombreActivo") as string).trim();
  const tipoActivoId = (formData.get("tipoActivoId") as string | null) || null;
  const subcategoriaId = (formData.get("subcategoriaId") as string | null) || null;
  if (!nombreActivo || !tipoActivoId) {
    throw new Error("Nombre y tipo de activo son obligatorios.");
  }

  const tipoActivo = await prisma.tipoActivo.findUnique({ where: { id: tipoActivoId } });
  if (!tipoActivo) {
    throw new Error("Tipo de activo inválido.");
  }

  const subcategoria = subcategoriaId
    ? await prisma.subcategoriaActivo.findUnique({
        where: { id: subcategoriaId },
        include: { categoria: true, campos: { where: { estado: true } } },
      })
    : null;
  if (subcategoriaId && !subcategoria) {
    throw new Error("Subcategoría inválida.");
  }
  if (subcategoria && subcategoria.categoria.tipoActivoId !== tipoActivoId) {
    throw new Error("La subcategoría elegida no pertenece al tipo de activo.");
  }

  const { sedeId, unidadOperativaId, ambienteId } = await resolveUbicacion(formData);
  const proveedorId = await resolveProveedorId(formData);
  // Sin subcategoría no hay campos de especificación que leer.
  const especificaciones = subcategoria ? readEspecificaciones(subcategoria.campos, formData) : [];

  const fechaAdquisicionRaw = (formData.get("fechaAdquisicion") as string | null) || null;
  const condicionFisicaRaw = (formData.get("condicionFisica") as string | null) || null;

  return {
    nombreActivo,
    nombreNormalizado: normalizeName(nombreActivo) ?? nombreActivo,
    descripcion: (formData.get("descripcion") as string | null)?.trim() || null,
    subcategoriaId,
    tipoActivoId,
    sedeId,
    unidadOperativaId,
    ambienteId,
    proveedorId,
    fechaAdquisicion: fechaAdquisicionRaw ? new Date(fechaAdquisicionRaw) : null,
    // El input se oculta en activo-form.tsx cuando el Activo nació de una
    // importación (numeroFactura ya heredado del Import, ver
    // activo-creation.ts) — formData.has() en `undefined` le dice a Prisma
    // "no toques esta columna" en vez de pisarla con null al no venir el campo.
    numeroFactura: formData.has("numeroFactura")
      ? (formData.get("numeroFactura") as string).trim() || null
      : undefined,
    // Mismo criterio que numeroFactura de arriba: el input se oculta en
    // activo-form.tsx para activos nacidos de una importación (numeroFC ya
    // heredado del Import, ver activo-creation.ts).
    numeroFC: formData.has("numeroFC") ? (formData.get("numeroFC") as string).trim() || null : undefined,
    codigoProyecto: (formData.get("codigoProyecto") as string | null)?.trim() || null,
    costoAdquisicion: parseDecimal(formData, "costoAdquisicion", "Costo de adquisición"),
    // Fase 60: con la depreciación definida el formulario no envía estos dos
    // campos (los muestra calculados y bloqueados) — `undefined` le dice a
    // Prisma "no toques la columna"; sincronizarValoresContables los
    // recalcula en la misma transacción.
    valorContable: formData.has("valorContable") ? parseDecimal(formData, "valorContable", "Valor contable") : undefined,
    valorActual: formData.has("valorActual") ? parseDecimal(formData, "valorActual", "Valor actual") : undefined,
    estadoPatrimonial: ((formData.get("estadoPatrimonial") as string | null) ||
      "DISPONIBLE") as EstadoPatrimonial,
    condicionFisica: condicionFisicaRaw ? (condicionFisicaRaw as CondicionFisica) : null,
    observaciones: (formData.get("observaciones") as string | null)?.trim() || null,
    especificaciones,
  };
}

export async function createActivoAction(formData: FormData): Promise<void> {
  const actor = await requireSessionUsuario();
  const { especificaciones, ...data } = await readActivoInput(formData);
  if (data.estadoPatrimonial === "BAJA") {
    throw new Error("Un activo nuevo no puede registrarse dado de baja.");
  }

  const activo = await prisma.$transaction(async (tx) => {
    const tipoActivo = await tx.tipoActivo.findUniqueOrThrow({ where: { id: data.tipoActivoId } });
    const codigoPatrimonial = await generarCodigoPatrimonial(tx, {
      tipoActivoCode: tipoActivo.code,
      nombreActivo: data.nombreActivo,
    });

    const created = await tx.activo.create({
      data: {
        ...data,
        codigoPatrimonial,
        especificaciones: { create: especificaciones },
      },
      include: { tipoActivo: true, sede: true },
    });
    await sincronizarValoresContables(tx, [created.id]);
    await tx.movimiento.create({
      data: { activoId: created.id, usuarioId: actor.id, ...buildMovimientoDeAlta(created) },
    });
    await registrarAuditoria(
      {
        accion: "DAR_DE_ALTA",
        entidad: "Activo",
        entidadId: created.id,
        detalle: {
          nombreActivo: created.nombreActivo,
          codigoPatrimonial: created.codigoPatrimonial,
          tipo: created.tipoActivo.name,
          sede: created.sede?.name ?? null,
        },
        usuarioId: actor.id,
      },
      tx
    );
    return created;
  });

  revalidatePath("/activos");
  redirect(`/activos/${activo.id}`);
}

// codigoPatrimonial nunca se toca acá: es fijo desde que se genera al crear
// el Activo (ver createActivoAction / createActivosFromImportItem) — queda
// impreso en una etiqueta física, así que editarlo después rompería esa
// referencia. readActivoInput no lo lee del formulario porque el campo ya
// no existe en activo-form.tsx (se muestra de solo lectura).
export async function updateActivoAction(activoId: string, formData: FormData): Promise<void> {
  const actor = await requireSessionUsuario();
  const { especificaciones, ...data } = await readActivoInput(formData);

  await prisma.$transaction(async (tx) => {
    const anterior = await tx.activo.findUniqueOrThrow({ where: { id: activoId } });
    // Fase 66: la baja y la reactivación tienen su propio flujo (con motivo y
    // fecha); un activo dado de baja no se edita hasta reactivarlo.
    if (anterior.estadoPatrimonial === "BAJA") {
      throw new Error("El activo está dado de baja: reactívalo para poder editarlo.");
    }
    if (data.estadoPatrimonial === "BAJA") {
      throw new Error('Para dar de baja un activo usa el botón "Dar de baja".');
    }
    // Fase 58: con depreciación registrada, costo/fecha/tipo quedan fijos.
    await assertSinCambiosDepreciables(tx, anterior, data);

    await tx.activoEspecificacionValor.deleteMany({ where: { activoId } });
    await tx.activo.update({
      where: { id: activoId },
      data: {
        ...data,
        especificaciones: { create: especificaciones },
      },
    });
    await sincronizarValoresContables(tx, [activoId]);

    // Fase 9: si cambió ubicación o estado patrimonial, queda un Movimiento
    // (ver lib/activos/movimientos.ts) — no crea uno si solo cambió texto
    // (nombre, descripción, valores económicos, etc.). La Auditoría, en
    // cambio, se registra siempre que se edita: "qué hizo el usuario" no
    // depende de si el cambio fue patrimonialmente relevante.
    const movimiento = buildMovimientoDeEdicion(anterior, data);
    if (movimiento) {
      await tx.movimiento.create({ data: { activoId, usuarioId: actor.id, ...movimiento } });
      // Fase 49: notifica solo si el tipo de movimiento está en el alcance
      // pedido (ver TIPO_MOVIMIENTO_A_NOTIFICACION) — no una por cada edición.
      const sede = movimiento.sedeNuevaId
        ? await tx.sede.findUnique({ where: { id: movimiento.sedeNuevaId }, select: { name: true } })
        : null;
      await crearNotificacionDesdeMovimiento(
        {
          tipoMovimiento: movimiento.tipo,
          activo: { id: activoId, nombreActivo: data.nombreActivo, codigoPatrimonial: anterior.codigoPatrimonial },
          actorId: actor.id,
          sedeNombre: sede?.name ?? null,
        },
        tx
      );
    }
    await registrarAuditoria(
      {
        accion: movimientoTipoAAccionAuditoria(movimiento?.tipo ?? null),
        entidad: "Activo",
        entidadId: activoId,
        detalle: { nombreActivo: data.nombreActivo, codigoPatrimonial: anterior.codigoPatrimonial },
        usuarioId: actor.id,
      },
      tx
    );
  });

  revalidatePath(`/activos/${activoId}`);
  revalidatePath("/activos");
}

// Fase 8 + 9: asignar/desasignar un Responsable actual, dejando su
// Movimiento correspondiente en la misma transacción.

export async function asignarResponsableAction(activoId: string, responsableId: string): Promise<void> {
  const actor = await requireSessionUsuario();
  if (!responsableId) {
    throw new Error("Selecciona un responsable.");
  }

  await prisma.$transaction(async (tx) => {
    const activo = await tx.activo.findUniqueOrThrow({ where: { id: activoId } });
    if (activo.estadoPatrimonial === "BAJA") {
      throw new Error("No se puede asignar un activo dado de baja.");
    }
    const responsable = await tx.responsable.findUniqueOrThrow({ where: { id: responsableId } });

    await tx.activo.update({
      where: { id: activoId },
      data: { responsableActualId: responsableId, estadoPatrimonial: "ASIGNADO" },
    });

    const tipoMovimiento = activo.responsableActualId ? "REASIGNACION" : "ASIGNACION";
    await tx.movimiento.create({
      data: {
        activoId,
        usuarioId: actor.id,
        tipo: tipoMovimiento,
        responsableAnteriorId: activo.responsableActualId,
        responsableNuevoId: responsableId,
        estadoAnterior: activo.estadoPatrimonial,
        estadoNuevo: "ASIGNADO",
      },
    });
    await crearNotificacionDesdeMovimiento(
      {
        tipoMovimiento,
        activo: { id: activoId, nombreActivo: activo.nombreActivo, codigoPatrimonial: activo.codigoPatrimonial },
        actorId: actor.id,
        responsableNombre: nombreCompleto(responsable),
      },
      tx
    );
    await registrarAuditoria(
      {
        accion: "ASIGNAR",
        entidad: "Activo",
        entidadId: activoId,
        detalle: {
          nombreActivo: activo.nombreActivo,
          codigoPatrimonial: activo.codigoPatrimonial,
          responsable: nombreCompleto(responsable),
        },
        usuarioId: actor.id,
      },
      tx
    );
  });

  revalidatePath(`/activos/${activoId}`);
  revalidatePath("/activos");
}

export async function desasignarResponsableAction(activoId: string): Promise<void> {
  const actor = await requireSessionUsuario();
  await prisma.$transaction(async (tx) => {
    const activo = await tx.activo.findUniqueOrThrow({ where: { id: activoId } });
    // Desasignar deja el activo DISPONIBLE: sobre uno dado de baja sería una
    // reactivación encubierta (Fase 66).
    if (activo.estadoPatrimonial === "BAJA") throw new Error("El activo está dado de baja.");
    const responsableAnterior = activo.responsableActualId
      ? await tx.responsable.findUnique({ where: { id: activo.responsableActualId } })
      : null;

    await tx.activo.update({
      where: { id: activoId },
      data: { responsableActualId: null, estadoPatrimonial: "DISPONIBLE" },
    });

    await tx.movimiento.create({
      data: {
        activoId,
        usuarioId: actor.id,
        tipo: "CAMBIO_RESPONSABLE",
        responsableAnteriorId: activo.responsableActualId,
        responsableNuevoId: null,
        estadoAnterior: activo.estadoPatrimonial,
        estadoNuevo: "DISPONIBLE",
      },
    });
    await crearNotificacionDesdeMovimiento(
      {
        tipoMovimiento: "CAMBIO_RESPONSABLE",
        activo: { id: activoId, nombreActivo: activo.nombreActivo, codigoPatrimonial: activo.codigoPatrimonial },
        actorId: actor.id,
        responsableNombre: responsableAnterior ? nombreCompleto(responsableAnterior) : null,
      },
      tx
    );
    await registrarAuditoria(
      {
        accion: "ACTUALIZAR",
        entidad: "Activo",
        entidadId: activoId,
        detalle: {
          motivo: "desasignar_responsable",
          nombreActivo: activo.nombreActivo,
          codigoPatrimonial: activo.codigoPatrimonial,
          responsableAnterior: responsableAnterior ? nombreCompleto(responsableAnterior) : null,
        },
        usuarioId: actor.id,
      },
      tx
    );
  });

  revalidatePath(`/activos/${activoId}`);
  revalidatePath("/activos");
}

export async function deleteActivoAction(activoId: string): Promise<void> {
  const actor = await requireSessionUsuario();
  if (!puedeEliminarActivos(actor.rol)) {
    throw new Error("Solo un Super Administrador puede eliminar activos.");
  }
  const activo = await prisma.activo.findUniqueOrThrow({
    where: { id: activoId },
    include: { _count: { select: CONTEO_ELIMINACION } },
  });

  // Fase 66 (ver lib/activos/eliminacion.ts). Los documentos ya quitados de
  // la ficha (estado = false) no bloquean: sus filas caen por el Cascade y
  // los archivos se archivan abajo en vez de quedar huérfanos (Fase 65).
  const motivo = motivoNoEliminable(aActivoEliminable(activo));
  if (motivo) {
    throw new Error(`No se puede eliminar: ${motivo}. Si el bien ya no está en uso, dalo de baja.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.activo.delete({ where: { id: activoId } });
    await registrarAuditoria(
      {
        accion: "ELIMINAR",
        entidad: "Activo",
        entidadId: activoId,
        detalle: { nombreActivo: activo.nombreActivo, codigoPatrimonial: activo.codigoPatrimonial },
        usuarioId: actor.id,
      },
      tx
    );
  });

  try {
    await archivarDocumentosActivo(activoId);
  } catch (error) {
    console.error(`No se pudo archivar la carpeta de documentos del activo ${activoId}`, error);
  }

  revalidatePath("/activos");
  redirect("/activos");
}

// ---------------------------------------------------------------------------
// Fase 66: baja y reactivación
// ---------------------------------------------------------------------------

const MOTIVOS_BAJA = new Set(Object.keys(MOTIVO_BAJA_LABELS));

// Fecha de hoy en Lima (UTC-5, sin horario de verano) como "AAAA-MM-DD".
function hoyEnLima(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface DarDeBajaInput {
  motivo: string;
  fecha: string;
  observaciones: string;
}

// La baja nunca borra: deja el activo en BAJA con su motivo y fecha, le
// quita el responsable y registra el Movimiento. La depreciación se detiene
// después del trimestre de la baja (ver planificarDepreciacion).
export async function darDeBajaActivoAction(activoId: string, input: DarDeBajaInput): Promise<void> {
  const actor = await requireSessionUsuario();
  const motivo = input.motivo;
  const observaciones = input.observaciones.trim() || null;
  if (!MOTIVOS_BAJA.has(motivo)) throw new Error("Elige el motivo de la baja.");
  if (motivo === "OTRO" && !observaciones) {
    throw new Error('Con el motivo "Otro" las observaciones son obligatorias.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha) || Number.isNaN(new Date(input.fecha).getTime())) {
    throw new Error("Indica una fecha de baja válida.");
  }
  if (input.fecha > hoyEnLima()) throw new Error("La fecha de baja no puede ser futura.");
  const fechaBaja = new Date(input.fecha);

  await prisma.$transaction(async (tx) => {
    const activo = await tx.activo.findUniqueOrThrow({ where: { id: activoId } });
    if (activo.estadoPatrimonial === "BAJA") throw new Error("El activo ya está dado de baja.");
    if (activo.fechaAdquisicion && fechaBaja < activo.fechaAdquisicion) {
      throw new Error("La fecha de baja no puede ser anterior a la fecha de adquisición.");
    }

    await tx.activo.update({
      where: { id: activoId },
      data: {
        estadoPatrimonial: "BAJA",
        responsableActualId: null,
        fechaBaja,
        motivoBaja: motivo as MotivoBaja,
        observacionesBaja: observaciones,
      },
    });
    await tx.movimiento.create({
      data: {
        activoId,
        usuarioId: actor.id,
        tipo: "BAJA",
        responsableAnteriorId: activo.responsableActualId,
        responsableNuevoId: null,
        estadoAnterior: activo.estadoPatrimonial,
        estadoNuevo: "BAJA",
        motivo: MOTIVO_BAJA_LABELS[motivo],
        observaciones,
      },
    });
    await sincronizarValoresContables(tx, [activoId]);
    await crearNotificacionDesdeMovimiento(
      {
        tipoMovimiento: "BAJA",
        activo: { id: activoId, nombreActivo: activo.nombreActivo, codigoPatrimonial: activo.codigoPatrimonial },
        actorId: actor.id,
      },
      tx
    );
    await registrarAuditoria(
      {
        accion: "DAR_DE_BAJA",
        entidad: "Activo",
        entidadId: activoId,
        detalle: {
          nombreActivo: activo.nombreActivo,
          codigoPatrimonial: activo.codigoPatrimonial,
          motivo: MOTIVO_BAJA_LABELS[motivo],
          fechaBaja: input.fecha,
        },
        usuarioId: actor.id,
      },
      tx
    );
  });

  revalidatePath(`/activos/${activoId}`);
  revalidatePath("/activos");
}

// Revierte una baja registrada por error (o un bien recuperado): vuelve a
// DISPONIBLE sin responsable y limpia los datos de la baja vigente. La baja
// anterior sigue visible en el historial de movimientos.
export async function reactivarActivoAction(activoId: string, motivo: string): Promise<void> {
  const actor = await requireSessionUsuario();
  const motivoLimpio = motivo.trim();
  if (!motivoLimpio) throw new Error("Indica el motivo de la reactivación.");

  await prisma.$transaction(async (tx) => {
    const activo = await tx.activo.findUniqueOrThrow({ where: { id: activoId } });
    if (activo.estadoPatrimonial !== "BAJA") throw new Error("El activo no está dado de baja.");

    await tx.activo.update({
      where: { id: activoId },
      data: { estadoPatrimonial: "DISPONIBLE", fechaBaja: null, motivoBaja: null, observacionesBaja: null },
    });
    await tx.movimiento.create({
      data: {
        activoId,
        usuarioId: actor.id,
        tipo: "REACTIVACION",
        estadoAnterior: "BAJA",
        estadoNuevo: "DISPONIBLE",
        motivo: motivoLimpio,
      },
    });
    await sincronizarValoresContables(tx, [activoId]);
    await registrarAuditoria(
      {
        accion: "ACTUALIZAR",
        entidad: "Activo",
        entidadId: activoId,
        detalle: {
          motivo: "reactivar_activo",
          nombreActivo: activo.nombreActivo,
          codigoPatrimonial: activo.codigoPatrimonial,
          motivoReactivacion: motivoLimpio,
        },
        usuarioId: actor.id,
      },
      tx
    );
  });

  revalidatePath(`/activos/${activoId}`);
  revalidatePath("/activos");
}
