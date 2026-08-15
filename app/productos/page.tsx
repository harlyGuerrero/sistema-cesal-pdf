import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; page?: string }>;
}) {
  const { q, categoryId, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    ...(q ? { nombreNormalizado: { contains: q, mode: "insensitive" as const } } : {}),
    ...(categoryId && categoryId !== "all" ? { tipoActivoId: categoryId } : {}),
  };

  const [products, total, categories] = await Promise.all([
    prisma.activo.findMany({
      where,
      include: { tipoActivo: true },
      orderBy: { nombreNormalizado: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.activo.count({ where }),
    prisma.tipoActivo.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Productos</h1>
        <Button render={<Link href="/productos/nuevo" />} nativeButton={false}>
          Nuevo producto
        </Button>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre..."
          className="max-w-64"
        />
        <Select name="categoryId" defaultValue={categoryId ?? "all"}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo de activo</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Actualizado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Link href={`/productos/${product.id}`} className="hover:underline">
                  {product.nombreActivo}
                </Link>
              </TableCell>
              <TableCell>{product.tipoActivo.name}</TableCell>
              <TableCell>{product.importItemId ? "Importación" : "Manual"}</TableCell>
              <TableCell>{product.updatedAt.toLocaleDateString("es-PE")}</TableCell>
            </TableRow>
          ))}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No hay productos que coincidan con el filtro.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <PageLink page={page - 1} disabled={page <= 1} q={q} categoryId={categoryId}>
            Anterior
          </PageLink>
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages} q={q} categoryId={categoryId}>
            Siguiente
          </PageLink>
        </div>
      )}
    </main>
  );
}

function PageLink({
  page,
  disabled,
  q,
  categoryId,
  children,
}: {
  page: number;
  disabled: boolean;
  q?: string;
  categoryId?: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-muted-foreground">{children}</span>;
  }
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (categoryId) params.set("categoryId", categoryId);
  params.set("page", String(page));
  return (
    <Link href={`/productos?${params.toString()}`} className="hover:underline">
      {children}
    </Link>
  );
}
