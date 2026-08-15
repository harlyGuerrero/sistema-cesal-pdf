import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { UsuarioEditForm } from "./usuario-edit-form";
import { DeleteUsuarioButton } from "./delete-usuario-button";

export default async function UsuarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">{usuario.nombre}</h1>
        <Link href="/usuarios" className="text-sm text-muted-foreground hover:underline">
          ← Volver a usuarios
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Editar</h2>
        <UsuarioEditForm usuarioId={usuario.id} nombre={usuario.nombre} email={usuario.email ?? ""} />
      </section>

      <section className="border-t pt-4">
        <DeleteUsuarioButton usuarioId={usuario.id} />
      </section>
    </main>
  );
}
