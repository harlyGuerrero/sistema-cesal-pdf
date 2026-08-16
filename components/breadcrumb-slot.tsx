"use client";

import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "lucide-react";
import { useBreadcrumbContext } from "./breadcrumb-context";

// Fase 24: pinta el breadcrumb publicado por PageBreadcrumb — vive dentro
// del <header> fijo de app/(app)/layout.tsx, en la misma fila que
// SidebarTrigger, para que sea una sola barra real (no dos apiladas).
export function BreadcrumbSlot() {
  const { items } = useBreadcrumbContext();

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
      <Link href="/" aria-label="Dashboard" className="flex items-center text-muted-foreground hover:text-foreground">
        <HomeIcon className="size-4" />
      </Link>
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
