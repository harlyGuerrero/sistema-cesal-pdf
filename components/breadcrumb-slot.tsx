"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { useBreadcrumbContext } from "./breadcrumb-context";
import { resolveActiveUrl } from "./nav-main";
import { ALL_NAV_ITEMS } from "@/lib/nav-items";

// Fase 28: pinta el breadcrumb publicado por PageBreadcrumb — vive dentro
// del <header> fijo de app/(app)/layout.tsx, en la misma fila que
// SidebarTrigger, para que sea una sola barra real (no dos apiladas). El
// primer segmento ya no es un ícono de casa fijo: es el nombre del módulo
// donde está parado el usuario (resuelto contra la misma lista de
// MAIN_NAV_ITEMS/ACTIVOS_CONFIG_NAV_ITEMS/ORG_NAV_ITEMS que usa el sidebar,
// vía resolveActiveUrl) — en una página de listado (sin PageBreadcrumb
// propio, items vacío) es el único segmento y no es clicable, porque ya
// estás ahí; en una página de detalle es el primer link de la ruta.
export function BreadcrumbSlot() {
  const { items } = useBreadcrumbContext();
  const pathname = usePathname();

  const activeUrl = resolveActiveUrl(pathname, ALL_NAV_ITEMS);
  const currentModule = ALL_NAV_ITEMS.find((item) => item.url === activeUrl);
  const moduleLabel = currentModule?.title ?? "Dashboard";
  const moduleHref = currentModule?.url ?? "/";

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.length > 0 ? (
        <Link href={moduleHref} className="text-muted-foreground hover:text-foreground">
          {moduleLabel}
        </Link>
      ) : (
        <span className="font-medium text-foreground">{moduleLabel}</span>
      )}
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <ChevronRightIcon className="size-3.5 text-muted-foreground" />
          {item.href ? (
            <Link href={item.href} className="text-muted-foreground hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-primary">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
