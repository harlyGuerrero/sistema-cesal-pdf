import Link from "next/link";
import { NewUsuarioForm } from "./new-usuario-form";

export default function NewUsuarioPage() {
  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Nuevo usuario</h1>
        <Link href="/usuarios" className="text-sm text-muted-foreground hover:underline">
          ← Volver a usuarios
        </Link>
      </div>
      <NewUsuarioForm />
    </main>
  );
}
