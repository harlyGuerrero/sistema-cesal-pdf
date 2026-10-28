import { Skeleton } from "@/components/ui/skeleton";

// Fase 59: esqueleto de la auditoría mientras llegan los registros.
export default function AuditoriaLoading() {
  return (
    <main className="space-y-6 p-4 sm:p-6" aria-busy="true" aria-label="Cargando auditoría">
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <div className="space-y-5 rounded-xl border p-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
