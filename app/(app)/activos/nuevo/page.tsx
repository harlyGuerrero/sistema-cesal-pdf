import Link from "next/link";
import { ActivoForm } from "../activo-form";
import { getActivoFormData } from "../form-data";

export default async function NewActivoPage() {
  const { tiposActivo, sedes } = await getActivoFormData();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Nuevo activo</h1>
        <Link href="/activos" className="text-sm text-muted-foreground hover:underline">
          ← Volver a activos
        </Link>
      </div>
      <ActivoForm tiposActivo={tiposActivo} sedes={sedes} />
    </main>
  );
}
