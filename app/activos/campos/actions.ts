"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { TIPOS_DATO_CON_CATALOGO } from "@/lib/activos/labels";
import type { TipoDato } from "@/lib/generated/prisma/client";

// Fase 4 de Activos: CRUD de CampoEspecificacion por subcategoría. El
// formulario que consume estos campos para capturar el valor real de un
// Activo (ActivoEspecificacionValor) llega en Fase 6, junto con el alta de
// Activo — acá solo se define QUÉ campos tiene cada subcategoría.

function readCampoInput(formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim();
  const etiqueta = (formData.get("etiqueta") as string).trim();
  const tipoDato = formData.get("tipoDato") as TipoDato;
  const unidad = (formData.get("unidad") as string | null)?.trim() || null;
  const catalogoIdRaw = (formData.get("catalogoId") as string | null) || null;
  const obligatorio = formData.get("obligatorio") === "true";

  if (!nombre || !etiqueta || !tipoDato) {
    throw new Error("Nombre, etiqueta y tipo de dato son obligatorios.");
  }

  const requiereCatalogo = TIPOS_DATO_CON_CATALOGO.has(tipoDato);
  if (requiereCatalogo && !catalogoIdRaw) {
    throw new Error("Este tipo de dato requiere seleccionar un catálogo.");
  }

  return {
    nombre,
    etiqueta,
    tipoDato,
    unidad,
    obligatorio,
    catalogoId: requiereCatalogo ? catalogoIdRaw : null,
  };
}

export async function createCampoAction(subcategoriaId: string, formData: FormData): Promise<void> {
  const data = readCampoInput(formData);

  const existing = await prisma.campoEspecificacion.findUnique({
    where: { subcategoriaId_nombre: { subcategoriaId, nombre: data.nombre } },
  });
  if (existing) {
    throw new Error(`Ya existe un campo llamado "${data.nombre}" en esta subcategoría.`);
  }

  await prisma.campoEspecificacion.create({ data: { subcategoriaId, ...data } });

  revalidatePath("/activos/campos");
}

export async function updateCampoAction(campoId: string, formData: FormData): Promise<void> {
  const data = readCampoInput(formData);

  const campo = await prisma.campoEspecificacion.findUniqueOrThrow({ where: { id: campoId } });

  const existing = await prisma.campoEspecificacion.findUnique({
    where: { subcategoriaId_nombre: { subcategoriaId: campo.subcategoriaId, nombre: data.nombre } },
  });
  if (existing && existing.id !== campoId) {
    throw new Error(`Ya existe un campo llamado "${data.nombre}" en esta subcategoría.`);
  }

  await prisma.campoEspecificacion.update({ where: { id: campoId }, data });

  revalidatePath("/activos/campos");
}

export async function deleteCampoAction(campoId: string): Promise<void> {
  const campo = await prisma.campoEspecificacion.findUniqueOrThrow({
    where: { id: campoId },
    include: { _count: { select: { valores: true } } },
  });

  // ActivoEspecificacionValor siempre está vacía hasta Fase 6, pero el guard
  // ya se escribe ahora (mismo criterio que SubcategoriaActivo en Fase 3).
  if (campo._count.valores > 0) {
    throw new Error("No se puede eliminar: hay activos con valor cargado en este campo.");
  }

  await prisma.campoEspecificacion.delete({ where: { id: campoId } });

  revalidatePath("/activos/campos");
}
