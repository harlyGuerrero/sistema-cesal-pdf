import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SedeEditForm } from "./sede-edit-form";
import { DeleteSedeButton } from "./delete-sede-button";
import { UnidadOperativaSection } from "./unidad-operativa-section";
import { AmbienteSection } from "./ambiente-section";

export default async function SedeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sede = await prisma.sede.findUnique({
    where: { id },
    include: {
      unidadesOperativas: { orderBy: { name: "asc" } },
      ambientes: {
        orderBy: { name: "asc" },
        include: { unidadOperativa: { select: { id: true, name: true } } },
      },
      _count: { select: { unidadesOperativas: true, ambientes: true } },
    },
  });

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
        <SedeEditForm sedeId={sede.id} name={sede.name} region={sede.region} />
      </section>

      <section className="space-y-3 border-t pt-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Unidades operativas ({sede.unidadesOperativas.length})
        </h2>
        <UnidadOperativaSection sedeId={sede.id} unidades={sede.unidadesOperativas} />
      </section>

      <section className="space-y-3 border-t pt-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Ambientes ({sede.ambientes.length})
        </h2>
        <AmbienteSection
          sedeId={sede.id}
          ambientes={sede.ambientes}
          unidadesOperativas={sede.unidadesOperativas}
        />
      </section>

      <section className="border-t pt-4">
        <DeleteSedeButton
          sedeId={sede.id}
          hasChildren={sede._count.unidadesOperativas > 0 || sede._count.ambientes > 0}
        />
      </section>
    </main>
  );
}
