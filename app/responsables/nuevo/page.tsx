import Link from "next/link";
import { prisma } from "@/lib/db";
import { NewResponsableForm } from "./new-responsable-form";

export default async function NewResponsablePage() {
  const sedes = await prisma.sede.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Nuevo responsable</h1>
        <Link href="/responsables" className="text-sm text-muted-foreground hover:underline">
          ← Volver a responsables
        </Link>
      </div>
      <NewResponsableForm sedes={sedes} />
    </main>
  );
}
