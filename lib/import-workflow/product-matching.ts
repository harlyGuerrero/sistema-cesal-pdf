import { prisma } from "@/lib/db";

// Confirmar un ImportItem vincula a un Product existente (mismo normalizedName
// + categoría) o crea uno nuevo — nunca duplica (ver skill import-workflow,
// Fase 10: "usar normalizedName para detectar coincidencias").
export async function findOrCreateProduct(params: {
  categoryId: string;
  normalizedName: string;
  displayName: string;
}): Promise<string> {
  const existing = await prisma.product.findFirst({
    where: { categoryId: params.categoryId, normalizedName: params.normalizedName },
  });
  if (existing) return existing.id;

  const created = await prisma.product.create({
    data: {
      name: params.displayName,
      normalizedName: params.normalizedName,
      categoryId: params.categoryId,
    },
  });
  return created.id;
}
