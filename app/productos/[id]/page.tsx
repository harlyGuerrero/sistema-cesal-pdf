import Link from "next/link";
import { InfoIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IMPORT_ITEM_STATUS_LABELS, IMPORT_ITEM_STATUS_VARIANT } from "@/lib/import-workflow/labels";
import { ProductEditForm } from "./product-edit-form";
import { DeleteProductButton } from "./delete-product-button";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const { id } = await params;
  const { duplicate } = await searchParams;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        importItems: {
          include: { import: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">{product.name}</h1>
        <Link href="/productos" className="text-sm text-muted-foreground hover:underline">
          ← Volver a productos
        </Link>
      </div>

      {duplicate && (
        <Alert>
          <InfoIcon />
          <AlertDescription>
            Ya existía un producto con este nombre y categoría — te llevamos a ese en vez de crear uno
            duplicado.
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Editar</h2>
        <ProductEditForm
          productId={product.id}
          name={product.name}
          categoryId={product.categoryId}
          categories={categories}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Historial de importaciones ({product.importItems.length})
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Archivo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Precio unitario</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {product.importItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link href={`/importaciones/${item.importId}`} className="hover:underline">
                    {item.import.fileName}
                  </Link>
                </TableCell>
                <TableCell>{item.createdAt.toLocaleDateString("es-PE")}</TableCell>
                <TableCell>{item.quantity !== null ? Number(item.quantity) : "—"}</TableCell>
                <TableCell>{item.unitPrice !== null ? Number(item.unitPrice).toFixed(2) : "—"}</TableCell>
                <TableCell>
                  <Badge variant={IMPORT_ITEM_STATUS_VARIANT[item.status] ?? "outline"}>
                    {IMPORT_ITEM_STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {product.importItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Sin importaciones asociadas todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="border-t pt-4">
        <DeleteProductButton productId={product.id} hasHistory={product.importItems.length > 0} />
      </section>
    </main>
  );
}
