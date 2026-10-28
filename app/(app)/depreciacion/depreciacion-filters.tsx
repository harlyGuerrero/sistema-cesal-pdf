"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADO_DEPRECIACION_OPTIONS, TRIMESTRE_OPTIONS } from "@/lib/depreciacion/labels";

const DEBOUNCE_MS = 350;

// Fase 58: mismo patrón de filtros en vivo que /activos (activos-filters.tsx)
// — debounce en el buscador, selects al toque, todo vía router.replace.
// Año/trimestre no filtran filas por fecha de compra: fijan el "corte", es
// decir, muestran la situación de cada activo al cierre de ese trimestre.
export function DepreciacionFilters({
  tiposActivo,
  anios,
}: {
  tiposActivo: { id: string; name: string }[];
  anios: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [syncedQ, setSyncedQ] = useState(urlQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (urlQ !== syncedQ) {
    setSyncedQ(urlQ);
    setQ(urlQ);
  }

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

  function handleSearchChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyParams({ q: value }), DEBOUNCE_MS);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    applyParams({ q });
  }

  function limpiarFiltros() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQ("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const hasFilters = [...searchParams.keys()].some((key) => key !== "page" && key !== "sort" && key !== "dir");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        <div className="col-span-2 space-y-1">
          <label htmlFor="depreciacion-q" className="truncate text-xs font-medium text-muted-foreground">
            Buscar activo
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="depreciacion-q"
              value={q}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Código patrimonial o nombre..."
              className="pl-8"
            />
            {isPending && (
              <Loader2Icon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
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
          <Select value={searchParams.get("estado") ?? "all"} onValueChange={(value) => applyParams({ estado: value as string })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {ESTADO_DEPRECIACION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Año de corte</label>
          <Select value={searchParams.get("anio") ?? "all"} onValueChange={(value) => applyParams({ anio: value as string })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Situación actual" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Situación actual</SelectItem>
              {anios.map((anio) => (
                <SelectItem key={anio} value={String(anio)}>
                  {anio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Trimestre de corte</label>
          <Select
            value={searchParams.get("trimestre") ?? "all"}
            onValueChange={(value) => applyParams({ trimestre: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Cierre del año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cierre del año</SelectItem>
              {TRIMESTRE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 sm:shrink-0">
        <Button type="button" className="flex-1 sm:flex-none" onClick={() => applyParams({ q })}>
          <FilterIcon />
          Filtrar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 sm:flex-none"
          onClick={limpiarFiltros}
          disabled={!hasFilters}
        >
          <XIcon />
          Limpiar
        </Button>
      </div>
    </div>
  );
}
