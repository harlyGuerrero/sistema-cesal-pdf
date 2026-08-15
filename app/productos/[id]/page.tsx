import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.activo.findUnique({
      where: { id },
      include: {
        tipoActivo: true,
        importItem: { include: { import: true } },
      },
    }),
    prisma.tipoActivo.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">{product.nombreActivo}</h1>
        <Link href="/productos" className="text-sm text-muted-foreground hover:underline">
          ← Volver a productos
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Editar</h2>
        <ProductEditForm
          productId={product.id}
          name={product.nombreActivo}
          categoryId={product.tipoActivoId}
          categories={categories}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Origen</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Archivo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cantidad de la fila</TableHead>
              <TableHead>Precio unitario</TableHead>
              <TableHead>Estado del ítem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {product.importItem ? (
              <TableRow>
                <TableCell>
                  <Link href={`/importaciones/${product.importItem.importId}`} className="hover:underline">
                    {product.importItem.import.fileName}
                  </Link>
                </TableCell>
                <TableCell>{product.importItem.createdAt.toLocaleDateString("es-PE")}</TableCell>
                <TableCell>
                  {product.importItem.quantity !== null ? Number(product.importItem.quantity) : "—"}
                </TableCell>
                <TableCell>
                  {product.importItem.unitPrice !== null
                    ? Number(product.importItem.unitPrice).toFixed(2)
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={IMPORT_ITEM_STATUS_VARIANT[product.importItem.status] ?? "outline"}>
                    {IMPORT_ITEM_STATUS_LABELS[product.importItem.status] ?? product.importItem.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Creado manualmente — no proviene de una importación.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="border-t pt-4">
        <DeleteProductButton productId={product.id} hasHistory={product.importItem !== null} />
      </section>
    </main>
  );
}
