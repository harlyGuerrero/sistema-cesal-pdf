"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADO_PATRIMONIAL_OPTIONS } from "@/lib/activos/labels";

const DEBOUNCE_MS = 350;

interface ActivosFiltersProps {
  tiposActivo: { id: string; name: string }[];
  sedes: { id: string; name: string }[];
}

// Fase 19: mismo patrón de filtros en vivo que /movimientos
// (movimientos-filters.tsx) — debounce en el buscador, selects/orden al
// toque, todo vía router.replace sin recarga completa.
export function ActivosFilters({ tiposActivo, sedes }: ActivosFiltersProps) {
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

  const hasFilters = [...searchParams.keys()].some((key) => key !== "page");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Buscar activo</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por nombre, código o factura..."
              className="pl-8"
            />
            {isPending && (
              <Loader2Icon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo de activo</label>
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
          <label className="text-xs font-medium text-muted-foreground">Sede</label>
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
          <label className="text-xs font-medium text-muted-foreground">Estado</label>
          <Select
            value={searchParams.get("estadoPatrimonial") ?? "all"}
            onValueChange={(value) => applyParams({ estadoPatrimonial: value as string })}
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

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Orden</label>
          <Select
            value={searchParams.get("sort") ?? "recientes"}
            onValueChange={(value) => applyParams({ sort: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recientes">Más recientes</SelectItem>
              <SelectItem value="antiguos">Más antiguos</SelectItem>
              <SelectItem value="nombre">Nombre A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" onClick={() => applyParams({ q })}>
          <FilterIcon />
          Filtrar
        </Button>
        <Button type="button" variant="outline" onClick={limpiarFiltros} disabled={!hasFilters}>
          <XIcon />
          Limpiar
        </Button>
      </div>
    </div>
  );
}
