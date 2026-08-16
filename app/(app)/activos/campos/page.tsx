import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampoList } from "./campo-list";

// Fase 4 de Activos: campos de especificación técnica por subcategoría (ej.
// "Memoria RAM" bajo Laptop). Selector server-side vía ?subcategoriaId= —
// mismo patrón de filtro por querystring que /activos.
export default async function CamposPage({
  searchParams,
}: {
  searchParams: Promise<{ subcategoriaId?: string }>;
}) {
  const { subcategoriaId } = await searchParams;

  const [tiposActivo, catalogos] = await Promise.all([
    prisma.tipoActivo.findMany({
      orderBy: { name: "asc" },
      include: {
        categorias: {
          orderBy: { nombre: "asc" },
          include: { subcategorias: { orderBy: { nombre: "asc" } } },
        },
      },
    }),
    prisma.catalogo.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const subcategoria = subcategoriaId
    ? await prisma.subcategoriaActivo.findUnique({
        where: { id: subcategoriaId },
        include: {
          categoria: { include: { tipoActivo: true } },
          campos: {
            orderBy: [{ orden: "asc" }, { nombre: "asc" }],
            include: { _count: { select: { valores: true } } },
          },
        },
      })
    : null;

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Campos de Especificación</h1>
        <p className="text-sm text-muted-foreground">
          Elige una subcategoría para administrar sus campos técnicos (ej. Marca, RAM, N° de serie).
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <Select name="subcategoriaId" defaultValue={subcategoriaId}>
          <SelectTrigger className="w-96">
            <SelectValue placeholder="Selecciona una subcategoría" />
          </SelectTrigger>
          <SelectContent>
            {tiposActivo.map((tipo) => (
              <SelectGroup key={tipo.id}>
                <SelectLabel>{tipo.name}</SelectLabel>
                {tipo.categorias.flatMap((categoria) =>
                  categoria.subcategorias.map((subcategoria) => (
                    <SelectItem key={subcategoria.id} value={subcategoria.id}>
                      {categoria.nombre} › {subcategoria.nombre}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Ver campos
        </Button>
      </form>

      {subcategoria && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {subcategoria.categoria.tipoActivo.name} › {subcategoria.categoria.nombre} ›{" "}
              <span className="text-foreground">{subcategoria.nombre}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CampoList
              subcategoriaId={subcategoria.id}
              campos={subcategoria.campos}
              catalogos={catalogos}
            />
          </CardContent>
        </Card>
      )}

      {!subcategoria && subcategoriaId && (
        <p className="text-sm text-destructive">No se encontró esa subcategoría.</p>
      )}
    </main>
  );
}
