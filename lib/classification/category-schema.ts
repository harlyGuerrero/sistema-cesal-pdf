import { z } from "zod";

// Los 7 tipos de activo oficiales, cerrados (ver ARCHITECTURE.md 5.2).
// Independiente del enum TipoActivoCode de Prisma a propósito — ver skill
// product-classification.
export const categoryCodeSchema = z.enum([
  "EDIFICACIONES",
  "VEHICULOS_Y_MEDIOS_DE_TRANSPORTE",
  "EQUIPOS_INFORMATICOS",
  "EQUIPOS_DE_OFICINA",
  "ACTIVOS_INTANGIBLES_INFORMATICOS",
  "MAQUINARIA_Y_EQUIPOS",
  "MOBILIARIO_Y_ENSERES",
]);

export type CategoryCode = z.infer<typeof categoryCodeSchema>;

export interface CategoryClassificationInput {
  normalizedName: string | null;
  name: string | null;
}
