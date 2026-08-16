"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEBOUNCE_MS = 350;

interface ResponsablesFiltersProps {
  sedes: { id: string; name: string }[];
}

// Fase 30: mismo patrón de filtros en vivo que /usuarios (usuarios-filters.tsx)
// y /activos (activos-filters.tsx) — debounce en el buscador, selects al
// toque, todo vía router.replace sin recarga completa.
export function ResponsablesFilters({ sedes }: ResponsablesFiltersProps) {
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
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Buscar responsable</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por nombre o correo..."
              className="pl-8"
            />
            {isPending && (
              <Loader2Icon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
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
            value={searchParams.get("estado") ?? "all"}
            onValueChange={(value) => applyParams({ estado: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="true">Activo</SelectItem>
              <SelectItem value="false">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" onClick={() => applyParams({ q })}>
          <FilterIcon />
          Filtros
        </Button>
        <Button type="button" variant="outline" onClick={limpiarFiltros} disabled={!hasFilters}>
          <XIcon />
          Limpiar
        </Button>
      </div>
    </div>
  );
}
