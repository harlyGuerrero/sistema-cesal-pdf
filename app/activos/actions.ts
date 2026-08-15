"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalization/normalize";
import { readEspecificaciones } from "@/lib/activos/especificaciones";
import { buildMovimientoDeAlta, buildMovimientoDeEdicion } from "@/lib/activos/movimientos";
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
    numeroFactura: (formData.get("numeroFactura") as string | null)?.trim() || null,
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
  const { especificaciones, ...data } = await readActivoInput(formData);

  const codigoPatrimonial = (formData.get("codigoPatrimonial") as string | null)?.trim() || null;
  if (codigoPatrimonial) {
    const existing = await prisma.activo.findUnique({ where: { codigoPatrimonial } });
    if (existing) {
      throw new Error(`Ya existe un activo con el código patrimonial "${codigoPatrimonial}".`);
    }
  }

  const activo = await prisma.$transaction(async (tx) => {
    const created = await tx.activo.create({
      data: {
        ...data,
        codigoPatrimonial,
        especificaciones: { create: especificaciones },
      },
    });
    await tx.movimiento.create({ data: { activoId: created.id, ...buildMovimientoDeAlta(created) } });
    return created;
  });

  revalidatePath("/activos");
  redirect(`/activos/${activo.id}`);
}

export async function updateActivoAction(activoId: string, formData: FormData): Promise<void> {
  const { especificaciones, ...data } = await readActivoInput(formData);

  const codigoPatrimonial = (formData.get("codigoPatrimonial") as string | null)?.trim() || null;
  if (codigoPatrimonial) {
    const existing = await prisma.activo.findUnique({ where: { codigoPatrimonial } });
    if (existing && existing.id !== activoId) {
      throw new Error(`Ya existe un activo con el código patrimonial "${codigoPatrimonial}".`);
    }
  }

  await prisma.$transaction(async (tx) => {
    const anterior = await tx.activo.findUniqueOrThrow({ where: { id: activoId } });

    await tx.activoEspecificacionValor.deleteMany({ where: { activoId } });
    await tx.activo.update({
      where: { id: activoId },
      data: {
        ...data,
        codigoPatrimonial,
        especificaciones: { create: especificaciones },
      },
    });

    // Fase 9: si cambió ubicación o estado patrimonial, queda un Movimiento
    // (ver lib/activos/movimientos.ts) — no crea uno si solo cambió texto
    // (nombre, descripción, valores económicos, etc.).
    const movimiento = buildMovimientoDeEdicion(anterior, data);
    if (movimiento) {
      await tx.movimiento.create({ data: { activoId, ...movimiento } });
    }
  });

  revalidatePath(`/activos/${activoId}`);
  revalidatePath("/activos");
}

// Fase 8 + 9: asignar/desasignar un Responsable actual, dejando su
// Movimiento correspondiente en la misma transacción.

export async function asignarResponsableAction(activoId: string, responsableId: string): Promise<void> {
  if (!responsableId) {
    throw new Error("Selecciona un responsable.");
  }

  await prisma.$transaction(async (tx) => {
    const activo = await tx.activo.findUniqueOrThrow({ where: { id: activoId } });
    if (activo.estadoPatrimonial === "BAJA") {
      throw new Error("No se puede asignar un activo dado de baja.");
    }

    await tx.activo.update({
      where: { id: activoId },
      data: { responsableActualId: responsableId, estadoPatrimonial: "ASIGNADO" },
    });

    await tx.movimiento.create({
      data: {
        activoId,
        tipo: activo.responsableActualId ? "REASIGNACION" : "ASIGNACION",
        responsableAnteriorId: activo.responsableActualId,
        responsableNuevoId: responsableId,
        estadoAnterior: activo.estadoPatrimonial,
        estadoNuevo: "ASIGNADO",
      },
    });
  });

  revalidatePath(`/activos/${activoId}`);
  revalidatePath("/activos");
}

export async function desasignarResponsableAction(activoId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const activo = await tx.activo.findUniqueOrThrow({ where: { id: activoId } });

    await tx.activo.update({
      where: { id: activoId },
      data: { responsableActualId: null, estadoPatrimonial: "DISPONIBLE" },
    });

    await tx.movimiento.create({
      data: {
        activoId,
        tipo: "CAMBIO_RESPONSABLE",
        responsableAnteriorId: activo.responsableActualId,
        responsableNuevoId: null,
        estadoAnterior: activo.estadoPatrimonial,
        estadoNuevo: "DISPONIBLE",
      },
    });
  });

  revalidatePath(`/activos/${activoId}`);
  revalidatePath("/activos");
}

export async function deleteActivoAction(activoId: string): Promise<void> {
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

  await prisma.activo.delete({ where: { id: activoId } });

  revalidatePath("/activos");
  redirect("/activos");
}
