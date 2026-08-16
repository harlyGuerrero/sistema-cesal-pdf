"use client";

import { useEffect } from "react";
import { useBreadcrumbContext, type BreadcrumbItem } from "./breadcrumb-context";

export type { BreadcrumbItem };

// Fase 24: publica el breadcrumb de la página actual en el contexto
// compartido (ver breadcrumb-context.tsx) — no pinta nada acá, quien lo
// pinta es BreadcrumbSlot dentro del header del layout, para que quede en la
// misma fila que el ícono de colapsar el sidebar. Cada página de detalle la
// renderiza una sola vez, con sus propios items.
export function PageBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const { setItems } = useBreadcrumbContext();

  useEffect(() => {
    setItems(items);
    return () => setItems([]);
  }, [items, setItems]);

  return null;
}
