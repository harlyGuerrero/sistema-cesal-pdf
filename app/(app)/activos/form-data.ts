import { prisma } from "@/lib/db";
import type { SedeOption, TipoActivoTree } from "./activo-form";

// Fase 6 de Activos: datos de referencia que necesita ActivoForm (crear y
// editar comparten exactamente el mismo árbol) — un solo lugar para no
// desalinear los dos formularios.
export async function getActivoFormData(): Promise<{
  tiposActivo: TipoActivoTree[];
  sedes: SedeOption[];
}> {
  const [tiposActivo, sedes] = await Promise.all([
    prisma.tipoActivo.findMany({
      orderBy: { name: "asc" },
      include: {
        tasaDepreciacion: true,
        categorias: {
          orderBy: { nombre: "asc" },
          include: {
            subcategorias: {
              orderBy: { nombre: "asc" },
              include: {
                campos: {
                  where: { estado: true },
                  orderBy: [{ orden: "asc" }, { nombre: "asc" }],
                  include: { catalogo: { include: { valores: { orderBy: { orden: "asc" } } } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.sede.findMany({
      orderBy: { name: "asc" },
      include: {
        unidadesOperativas: { orderBy: { name: "asc" } },
        ambientes: { orderBy: { name: "asc" } },
      },
    }),
  ]);

  // Fase 60: la tasa viaja como texto (un Decimal no se puede pasar a un
  // Client Component); solo la activa cuenta como configurada.
  return {
    tiposActivo: tiposActivo.map(({ tasaDepreciacion, ...tipo }) => ({
      ...tipo,
      tasaAnual: tasaDepreciacion?.activa ? tasaDepreciacion.tasaAnual.toString() : null,
    })),
    sedes,
  };
}
