import { prisma } from "@/lib/db";
import { CatalogoSection } from "./catalogo-section";
import { NewCatalogoForm } from "./new-catalogo-form";

// Fase 4 de Activos: catálogos genéricos reutilizables (ej. MARCA) que
// respaldan los CampoEspecificacion de tipo SELECCION/CATALOGO.
export default async function CatalogosPage() {
  const catalogos = await prisma.catalogo.findMany({
    include: {
      _count: { select: { valores: true, campos: true } },
      valores: {
        orderBy: [{ orden: "asc" }, { valor: "asc" }],
        include: { _count: { select: { especificaciones: true } } },
      },
    },
    orderBy: { nombre: "asc" },
  });

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Catálogos</h1>
        <p className="text-sm text-muted-foreground">
          Valores reutilizables (ej. Marca) para campos de especificación de tipo catálogo/selección.
        </p>
      </div>

      <div className="max-w-2xl space-y-2">
        {catalogos.map((catalogo) => (
          <CatalogoSection key={catalogo.id} catalogo={catalogo} />
        ))}
        {catalogos.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin catálogos todavía.</p>
        )}
      </div>

      <div className="max-w-2xl border-t pt-4">
        <NewCatalogoForm />
      </div>
    </main>
  );
}
