import Link from "next/link";
import { NewSedeForm } from "./new-sede-form";

export default function NewSedePage() {
  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Nueva sede</h1>
        <Link href="/sedes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a sedes
        </Link>
      </div>
      <NewSedeForm />
    </main>
  );
}
