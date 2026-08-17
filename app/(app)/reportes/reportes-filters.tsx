"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADO_PATRIMONIAL_OPTIONS } from "@/lib/activos/labels";

interface ReportesFiltersProps {
  sedes: { id: string; name: string }[];
  tiposActivo: { id: string; name: string }[];
}

// Fase 34: mismo patrón de filtros en vivo que /activos — sin buscador acá
// (el reporte no tiene un campo de texto libre natural, solo las 3
// dimensiones que ya tenía el <form method="get"> anterior), pero al toque
// en vez de requerir enviar el formulario.
export function ReportesFilters({ sedes, tiposActivo }: ReportesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const applyParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") params.delete(key);
        else params.set(key, value);
      }
      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  const hasFilters = [...searchParams.keys()].some((key) => key !== "page");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Sede</label>
          <Select
            value={searchParams.get("sedeId") ?? "all"}
            onValueChange={(value) => applyParams({ sedeId: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas las sedes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sedes</SelectItem>
              {sedes.map((sede) => (
                <SelectItem key={sede.id} value={sede.id}>
                  {sede.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Tipo de activo</label>
          <Select
            value={searchParams.get("tipoActivoId") ?? "all"}
            onValueChange={(value) => applyParams({ tipoActivoId: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {tiposActivo.map((tipo) => (
                <SelectItem key={tipo.id} value={tipo.id}>
                  {tipo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Estado</label>
          <Select
            value={searchParams.get("estado") ?? "all"}
            onValueChange={(value) => applyParams({ estado: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {ESTADO_PATRIMONIAL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="sm:shrink-0"
        disabled={!hasFilters || isPending}
        onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
      >
        <XIcon />
        Limpiar
      </Button>
    </div>
  );
}
