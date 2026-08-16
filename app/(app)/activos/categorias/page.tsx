import { prisma } from "@/lib/db";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CategoriaSection } from "./categoria-section";

// Fase 3 de Activos, restilizada en Fase 27: taxonomía administrable de 2
// niveles (Categoría -> Subcategoría) bajo cada uno de los 6 tipos de activo
// fijos. Cada TipoActivo es un AccordionItem colapsado por defecto — antes
// los 6 bloques quedaban siempre expandidos a la vez, con todas sus
// categorías y subcategorías visibles de entrada, lo que se sentía invasivo.
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

      <Accordion multiple className="gap-3">
        {tiposActivo.map((tipo) => (
          <AccordionItem key={tipo.id} value={tipo.id} className="rounded-xl border bg-card px-4">
            <AccordionTrigger className="text-base font-semibold">
              <span className="flex flex-1 items-center justify-between gap-2 pr-2">
                {tipo.name}
                <span className="text-sm font-normal text-muted-foreground">
                  {tipo.categorias.length} categoría{tipo.categorias.length === 1 ? "" : "s"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <CategoriaSection tipoActivoId={tipo.id} categorias={tipo.categorias} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </main>
  );
}
