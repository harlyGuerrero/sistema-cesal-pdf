import { z } from "zod";

// Categorías patrimoniales cerradas (ver ARCHITECTURE.md 5.2). Independiente
// del enum CategoryCode de Prisma a propósito — ver skill product-classification.
export const categoryCodeSchema = z.enum([
  "EQUIPOS_INFORMATICOS",
  "EQUIPOS_DE_OFICINA",
  "MUEBLES_DE_OFICINA",
  "BIENES_VEHICULARES",
  "EQUIPOS_DE_MAQUINARIA",
  "BIENES_INMUEBLES",
]);

export type CategoryCode = z.infer<typeof categoryCodeSchema>;

export interface CategoryClassificationInput {
  normalizedName: string | null;
  name: string | null;
}
