"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/activos/slug";

// Fase 3 de Activos: CRUD administrable de CategoriaActivo/SubcategoriaActivo
// bajo un TipoActivo (fijo, sin CRUD propio — ver Fase 2). Profundidad fija
// de 2 niveles, inspirado en categorías/subcategorías de WordPress pero sin
// árbol infinito (ver planificación de Activos §6).

export async function createCategoriaAction(tipoActivoId: string, formData: FormData): Promise<void> {
  const nombre = (formData.get("nombre") as string).trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");

  const slug = slugify(nombre);
  if (!slug) throw new Error("Nombre inválido.");

  const existing = await prisma.categoriaActivo.findUnique({
    where: { tipoActivoId_slug: { tipoActivoId, slug } },
  });
  if (existing) {
    throw new Error(`Ya existe una categoría llamada "${nombre}" en este tipo.`);
  }

  await prisma.categoriaActivo.create({ data: { tipoActivoId, nombre, slug } });

  revalidatePath("/activos/categorias");
}

export async function updateCategoriaAction(categoriaId: string, formData: FormData): Promise<void> {
  const nombre = (formData.get("nombre") as string).trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");

  const slug = slugify(nombre);
  if (!slug) throw new Error("Nombre inválido.");

  const categoria = await prisma.categoriaActivo.findUniqueOrThrow({ where: { id: categoriaId } });

  const existing = await prisma.categoriaActivo.findUnique({
    where: { tipoActivoId_slug: { tipoActivoId: categoria.tipoActivoId, slug } },
  });
  if (existing && existing.id !== categoriaId) {
    throw new Error(`Ya existe una categoría llamada "${nombre}" en este tipo.`);
  }

  await prisma.categoriaActivo.update({ where: { id: categoriaId }, data: { nombre, slug } });

  revalidatePath("/activos/categorias");
}

export async function deleteCategoriaAction(categoriaId: string): Promise<void> {
  const categoria = await prisma.categoriaActivo.findUniqueOrThrow({
    where: { id: categoriaId },
    include: { _count: { select: { subcategorias: true } } },
  });

  // Eliminación controlada: no se borra una categoría con subcategorías —
  // hay que vaciarla primero (mismo criterio que Sede/UnidadOperativa, Fase 5).
  if (categoria._count.subcategorias > 0) {
    throw new Error("No se puede eliminar: tiene subcategorías asociadas.");
  }

  await prisma.categoriaActivo.delete({ where: { id: categoriaId } });

  revalidatePath("/activos/categorias");
}

export async function createSubcategoriaAction(categoriaId: string, formData: FormData): Promise<void> {
  const nombre = (formData.get("nombre") as string).trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");

  const slug = slugify(nombre);
  if (!slug) throw new Error("Nombre inválido.");

  const existing = await prisma.subcategoriaActivo.findUnique({
    where: { categoriaId_slug: { categoriaId, slug } },
  });
  if (existing) {
    throw new Error(`Ya existe una subcategoría llamada "${nombre}" en esta categoría.`);
  }

  await prisma.subcategoriaActivo.create({ data: { categoriaId, nombre, slug } });

  revalidatePath("/activos/categorias");
}

export async function updateSubcategoriaAction(subcategoriaId: string, formData: FormData): Promise<void> {
  const nombre = (formData.get("nombre") as string).trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");

  const slug = slugify(nombre);
  if (!slug) throw new Error("Nombre inválido.");

  const subcategoria = await prisma.subcategoriaActivo.findUniqueOrThrow({ where: { id: subcategoriaId } });

  const existing = await prisma.subcategoriaActivo.findUnique({
    where: { categoriaId_slug: { categoriaId: subcategoria.categoriaId, slug } },
  });
  if (existing && existing.id !== subcategoriaId) {
    throw new Error(`Ya existe una subcategoría llamada "${nombre}" en esta categoría.`);
  }

  await prisma.subcategoriaActivo.update({ where: { id: subcategoriaId }, data: { nombre, slug } });

  revalidatePath("/activos/categorias");
}

export async function deleteSubcategoriaAction(subcategoriaId: string): Promise<void> {
  const subcategoria = await prisma.subcategoriaActivo.findUniqueOrThrow({
    where: { id: subcategoriaId },
    include: { _count: { select: { campos: true } } },
  });

  // CampoEspecificacion llega recién en Fase 4, pero el guard ya se escribe
  // ahora para no tener que recordar volver a esta acción entonces.
  if (subcategoria._count.campos > 0) {
    throw new Error("No se puede eliminar: tiene campos de especificación asociados.");
  }

  await prisma.subcategoriaActivo.delete({ where: { id: subcategoriaId } });

  revalidatePath("/activos/categorias");
}
