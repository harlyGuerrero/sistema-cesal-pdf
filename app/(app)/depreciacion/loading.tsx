import { Skeleton } from "@/components/ui/skeleton";

// Fase 58: el cálculo del módulo recorre todos los activos — se muestra la
// estructura de la página mientras llega.
export default function DepreciacionLoading() {
  return (
    <main className="space-y-6 p-4 sm:p-6" aria-busy="true" aria-label="Cargando depreciación">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </main>
  );
}
