"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENTIDADES_AUDITADAS, TIPO_ACCION_AUDITORIA_OPTIONS } from "@/lib/auditoria/labels";

const DEBOUNCE_MS = 350;

// Fase 32: mismo patrón de filtros en vivo que /movimientos
// (movimientos-filters.tsx) — buscador con debounce, selects/fechas/orden al
// toque, todo vía router.replace sin recarga completa.
export function AuditoriaFilters() {
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
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div className="col-span-2 space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Buscar usuario</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por nombre de usuario..."
              className="pl-8"
            />
            {isPending && (
              <Loader2Icon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Entidad</label>
          <Select
            value={searchParams.get("entidad") ?? "all"}
            onValueChange={(value) => applyParams({ entidad: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas las entidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las entidades</SelectItem>
              {ENTIDADES_AUDITADAS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Acción</label>
          <Select
            value={searchParams.get("accion") ?? "all"}
            onValueChange={(value) => applyParams({ accion: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas las acciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              {TIPO_ACCION_AUDITORIA_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Desde</label>
          <Input
            type="date"
            value={searchParams.get("fechaDesde") ?? ""}
            onChange={(event) => applyParams({ fechaDesde: event.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Hasta</label>
          <Input
            type="date"
            value={searchParams.get("fechaHasta") ?? ""}
            onChange={(event) => applyParams({ fechaHasta: event.target.value })}
          />
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
