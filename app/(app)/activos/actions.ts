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
import { crearNotificacionDesdeMovimiento } from "@/lib/notificaciones/crear";
import { requireSessionUsuario } from "@/lib/auth/session";
import { nombreCompleto } from "@/lib/nombre-completo";
import type { CondicionFisica, EstadoPatrimonial } from "@/lib/generated/prisma/client";

// Fase 6 de Activos: alta/edición/eliminación de Activo, integrando la
// ubicación (Fase 5) y los campos dinámicos de su subcategoría (Fase 4).
// tipoActivoId nunca se recibe del formulario: se deriva de subcategoriaId
// (ver schema.prisma, comentario en Activo).

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
  const subcategoriaId = formData.get("subcategoriaId") as string;
  if (!nombreActivo || !subcategoriaId) {
    throw new Error("Nombre y subcategoría son obligatorios.");
  }

  const subcategoria = await prisma.subcategoriaActivo.findUnique({
    where: { id: subcategoriaId },
    include: { categoria: true, campos: { where: { estado: true } } },
  });
  if (!subcategoria) {
    throw new Error("Subcategoría inválida.");
  }

  const { sedeId, unidadOperativaId, ambienteId } = await resolveUbicacion(formData);
  const proveedorId = await resolveProveedorId(formData);
  const especificaciones = readEspecificaciones(subcategoria.campos, formData);

  const fechaAdquisicionRaw = (formData.get("fechaAdquisicion") as string | null) || null;
  const condicionFisicaRaw = (formData.get("condicionFisica") as string | null) || null;

  return {
    nombreActivo,
    nombreNormalizado: normalizeName(nombreActivo) ?? nombreActivo,
    descripcion: (formData.get("descripcion") as string | null)?.trim() || null,
    subcategoriaId,
    tipoActivoId: subcategoria.categoria.tipoActivoId,
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
    codigoProyecto: (formData.get("codigoProyecto") as string | null)?.trim() || null,
    costoAdquisicion: parseDecimal(formData, "costoAdquisicion", "Costo de adquisición"),
    valorContable: parseDecimal(formData, "valorContable", "Valor contable"),
    valorActual: parseDecimal(formData, "valorActual", "Valor actual"),
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

    await tx.activoEspecificacionValor.deleteMany({ where: { activoId } });
    await tx.activo.update({
      where: { id: activoId },
      data: {
        ...data,
        especificaciones: { create: especificaciones },
      },
    });

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
  const activo = await prisma.activo.findUniqueOrThrow({
    where: { id: activoId },
    include: { _count: { select: { documentos: true } } },
  });

  // Eliminación controlada: un activo que viene de una importación no se
  // borra — rompería la trazabilidad Activo -> ImportItem -> Import (mismo
  // criterio que app/productos/actions.ts, Fase 1).
  if (activo.importItemId) {
    throw new Error("No se puede eliminar: proviene de una importación (mantiene trazabilidad).");
  }

  // Documento tiene onDelete: Cascade sobre activoId — sin este guard, borrar
  // el Activo borra la fila Documento pero deja el archivo físico huérfano
  // en document-storage/ (Fase 10), inalcanzable para siempre.
  if (activo._count.documentos > 0) {
    throw new Error("No se puede eliminar: tiene documentos adjuntos.");
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

  revalidatePath("/activos");
  redirect("/activos");
}
