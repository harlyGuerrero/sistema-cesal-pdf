"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/activos/slug";

// Fase 4 de Activos: CRUD de Catalogo/CatalogoValor (ej. MARCA -> Lenovo, HP,
// Dell). Respaldan los CampoEspecificacion de tipo SELECCION/CATALOGO en vez
// de texto libre repetido (ver planificación de Activos §14).

function codigoFromNombre(nombre: string): string {
  return slugify(nombre).toUpperCase().replace(/-/g, "_");
}

export async function createCatalogoAction(formData: FormData): Promise<void> {
  const nombre = (formData.get("nombre") as string).trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");

  const codigo = codigoFromNombre(nombre);
  if (!codigo) throw new Error("Nombre inválido.");

  const existing = await prisma.catalogo.findUnique({ where: { codigo } });
  if (existing) {
    throw new Error(`Ya existe un catálogo llamado "${nombre}".`);
  }

  await prisma.catalogo.create({ data: { nombre, codigo } });

  revalidatePath("/activos/catalogos");
}

export async function updateCatalogoAction(catalogoId: string, formData: FormData): Promise<void> {
  const nombre = (formData.get("nombre") as string).trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");

  const codigo = codigoFromNombre(nombre);
  if (!codigo) throw new Error("Nombre inválido.");

  const existing = await prisma.catalogo.findUnique({ where: { codigo } });
  if (existing && existing.id !== catalogoId) {
    throw new Error(`Ya existe un catálogo llamado "${nombre}".`);
  }

  await prisma.catalogo.update({ where: { id: catalogoId }, data: { nombre, codigo } });

  revalidatePath("/activos/catalogos");
}

export async function deleteCatalogoAction(catalogoId: string): Promise<void> {
  const catalogo = await prisma.catalogo.findUniqueOrThrow({
    where: { id: catalogoId },
    include: { _count: { select: { valores: true, campos: true } } },
  });

  if (catalogo._count.valores > 0) {
    throw new Error("No se puede eliminar: tiene valores asociados.");
  }
  if (catalogo._count.campos > 0) {
    throw new Error("No se puede eliminar: hay campos de especificación que lo usan.");
  }

  await prisma.catalogo.delete({ where: { id: catalogoId } });

  revalidatePath("/activos/catalogos");
}

export async function createCatalogoValorAction(catalogoId: string, formData: FormData): Promise<void> {
  const valor = (formData.get("valor") as string).trim();
  if (!valor) throw new Error("El valor es obligatorio.");

  const existing = await prisma.catalogoValor.findUnique({
    where: { catalogoId_valor: { catalogoId, valor } },
  });
  if (existing) {
    throw new Error(`Ya existe el valor "${valor}" en este catálogo.`);
  }

  await prisma.catalogoValor.create({ data: { catalogoId, valor } });

  revalidatePath("/activos/catalogos");
}

export async function updateCatalogoValorAction(valorId: string, formData: FormData): Promise<void> {
  const valor = (formData.get("valor") as string).trim();
  if (!valor) throw new Error("El valor es obligatorio.");

  const catalogoValor = await prisma.catalogoValor.findUniqueOrThrow({ where: { id: valorId } });

  const existing = await prisma.catalogoValor.findUnique({
    where: { catalogoId_valor: { catalogoId: catalogoValor.catalogoId, valor } },
  });
  if (existing && existing.id !== valorId) {
    throw new Error(`Ya existe el valor "${valor}" en este catálogo.`);
  }

  await prisma.catalogoValor.update({ where: { id: valorId }, data: { valor } });

  revalidatePath("/activos/catalogos");
}

export async function deleteCatalogoValorAction(valorId: string): Promise<void> {
  const catalogoValor = await prisma.catalogoValor.findUniqueOrThrow({
    where: { id: valorId },
    include: { _count: { select: { especificaciones: true } } },
  });

  if (catalogoValor._count.especificaciones > 0) {
    throw new Error("No se puede eliminar: hay activos que usan este valor.");
  }

  await prisma.catalogoValor.delete({ where: { id: valorId } });

  revalidatePath("/activos/catalogos");
}
