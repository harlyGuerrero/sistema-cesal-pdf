import { prisma } from "@/lib/db";
import { CategoriaSection } from "./categoria-section";

// Fase 3 de Activos: taxonomía administrable de 2 niveles (Categoría ->
// Subcategoría) bajo cada uno de los 6 tipos de activo fijos.
export default async function CategoriasActivoPage() {
  const tiposActivo = await prisma.tipoActivo.findMany({
    include: {
      categorias: {
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        include: {
          _count: { select: { subcategorias: true } },
          subcategorias: {
            orderBy: [{ orden: "asc" }, { nombre: "asc" }],
            include: { _count: { select: { campos: true } } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Categorías y Subcategorías</h1>
        <p className="text-sm text-muted-foreground">
          Taxonomía administrable bajo cada tipo de activo — hasta 2 niveles, sin tocar código.
        </p>
      </div>

      <div className="space-y-4">
        {tiposActivo.map((tipo) => (
          <CategoriaSection
            key={tipo.id}
            tipoActivoId={tipo.id}
            tipoActivoName={tipo.name}
            categorias={tipo.categorias}
          />
        ))}
      </div>
    </main>
  );
}
