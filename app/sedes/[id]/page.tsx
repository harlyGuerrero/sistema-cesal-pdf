import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SedeEditForm } from "./sede-edit-form";
import { DeleteSedeButton } from "./delete-sede-button";

export default async function SedeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sede = await prisma.sede.findUnique({ where: { id } });

  if (!sede) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">{sede.name}</h1>
        <Link href="/sedes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a sedes
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Editar</h2>
        <SedeEditForm sedeId={sede.id} name={sede.name} city={sede.city} region={sede.region} />
      </section>

      <section className="border-t pt-4">
        <DeleteSedeButton sedeId={sede.id} />
      </section>
    </main>
  );
}
