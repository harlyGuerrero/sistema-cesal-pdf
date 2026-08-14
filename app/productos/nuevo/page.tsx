import Link from "next/link";
import { prisma } from "@/lib/db";
import { NewProductForm } from "./new-product-form";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Nuevo producto</h1>
        <Link href="/productos" className="text-sm text-muted-foreground hover:underline">
          ← Volver a productos
        </Link>
      </div>
      <NewProductForm categories={categories} />
    </main>
  );
}
