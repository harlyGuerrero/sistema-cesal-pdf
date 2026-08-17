"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIA_NOTIFICACION_OPTIONS } from "@/lib/notificaciones/labels";
import { marcarTodasLeidasAction } from "./actions";

// Fase 49: mismo patrón de filtro en vivo (router.replace, sin recarga
// completa) que UsuariosFilters/ActivosFilters — "estado" son dos botones en
// vez de un Select porque el spec pide justo esos dos: [ Todas ] [ No leídas ].
export function NotificacionesFilters({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const estado = searchParams.get("estado") ?? "todas";
  const categoria = searchParams.get("categoria") ?? "all";

  function applyParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "all" || value === "todas") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function marcarTodas() {
    startTransition(async () => {
      await marcarTodasLeidasAction();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border p-0.5">
          <Button
            type="button"
            variant={estado === "todas" ? "default" : "ghost"}
            size="sm"
            onClick={() => applyParams({ estado: null })}
          >
            Todas
          </Button>
          <Button
            type="button"
            variant={estado === "no-leidas" ? "default" : "ghost"}
            size="sm"
            onClick={() => applyParams({ estado: "no-leidas" })}
          >
            No leídas
          </Button>
        </div>

        <Select value={categoria} onValueChange={(value) => applyParams({ categoria: value })}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIA_NOTIFICACION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="button" variant="outline" size="sm" disabled={isPending || unreadCount === 0} onClick={marcarTodas}>
        <CheckCheckIcon />
        Marcar todas como leídas
      </Button>
    </div>
  );
}
