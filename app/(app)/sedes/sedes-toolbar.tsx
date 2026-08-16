"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGridIcon, ListIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 350;

// Fase 31: buscador con debounce (mismo patrón que activos-filters.tsx) +
// selector de vista (por zonas / lista) — ambos viven en la misma barra,
// como en el resto de las pantallas de listado.
export function SedesToolbar({ view }: { view: "zonas" | "lista" }) {
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
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(event) => handleSearchChange(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Buscar sede..."
          className="pl-8"
        />
        {isPending && (
          <Loader2Icon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn(view === "zonas" && "border-primary bg-primary/5 text-primary hover:bg-primary/10")}
          onClick={() => applyParams({ view: "zonas", region: null })}
        >
          <LayoutGridIcon />
          Vista por zonas
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn(view === "lista" && "border-primary bg-primary/5 text-primary hover:bg-primary/10")}
          onClick={() => applyParams({ view: "lista" })}
        >
          <ListIcon />
          Vista de lista
        </Button>
      </div>
    </div>
  );
}
