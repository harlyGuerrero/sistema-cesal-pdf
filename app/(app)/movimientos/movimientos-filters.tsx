"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEBOUNCE_MS = 350;

interface MovimientosFiltersProps {
  tiposMovimiento: { value: string; label: string }[];
  sedes: { id: string; name: string }[];
  unidadesOperativas: { id: string; name: string; sede: { name: string } }[];
}

// Fase 15: filtros en vivo — cambiar cualquier campo actualiza la URL
// (router.replace, sin scroll) y Next.js vuelve a pedir solo el payload RSC
// de la página, no un documento completo: se siente "tipo Ajax" sin
// necesidad de un endpoint aparte ni de mover las consultas Prisma al
// cliente (seguirían viviendo en movimientos/page.tsx, un Server Component).
// Solo el texto de búsqueda usa debounce — los selects/fechas aplican al
// toque, porque ya son eventos discretos, no tecla por tecla.
export function MovimientosFilters({ tiposMovimiento, sedes, unidadesOperativas }: MovimientosFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [syncedQ, setSyncedQ] = useState(urlQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recién este render: la URL cambió por fuera de nuestro propio debounce
  // (navegación, "Limpiar", atrás/adelante del navegador) — re-sincroniza el
  // input. setState en render (guardado con syncedQ) en vez de useEffect,
  // para no encadenar un render extra por cada tecla (regla
  // react-hooks/set-state-in-effect).
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
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <div className="col-span-2 space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Buscar movimiento</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por activo, código o responsable..."
              className="pl-8"
            />
            {isPending && (
              <Loader2Icon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Tipo de movimiento</label>
          <Select value={searchParams.get("tipo") ?? "all"} onValueChange={(value) => applyParams({ tipo: value as string })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {tiposMovimiento.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Sede</label>
          <Select value={searchParams.get("sedeId") ?? "all"} onValueChange={(value) => applyParams({ sedeId: value as string })}>
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
          <label className="truncate text-xs font-medium text-muted-foreground">Unidad operativa</label>
          <Select
            value={searchParams.get("unidadOperativaId") ?? "all"}
            onValueChange={(value) => applyParams({ unidadOperativaId: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas las unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las unidades</SelectItem>
              {unidadesOperativas.map((unidad) => (
                <SelectItem key={unidad.id} value={unidad.id}>
                  {unidad.sede.name} · {unidad.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Fecha desde</label>
          <Input
            type="date"
            value={searchParams.get("fechaDesde") ?? ""}
            onChange={(event) => applyParams({ fechaDesde: event.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Fecha hasta</label>
          <Input
            type="date"
            value={searchParams.get("fechaHasta") ?? ""}
            onChange={(event) => applyParams({ fechaHasta: event.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="truncate text-xs font-medium text-muted-foreground">Orden</label>
          <Select value={searchParams.get("sort") === "asc" ? "asc" : "desc"} onValueChange={(value) => applyParams({ sort: value as string })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Más recientes</SelectItem>
              <SelectItem value="asc">Más antiguos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fijos: siempre al final de la barra, nunca se mezclan con el resto
          de los campos ni cambian de lugar cuando estos se envuelven. */}
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
