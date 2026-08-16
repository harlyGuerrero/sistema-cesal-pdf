"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbContextValue {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

// Fase 24: fuente de verdad compartida entre PageBreadcrumb (cada página la
// "publica") y BreadcrumbSlot (el header del layout la pinta) — ver
// app/(app)/layout.tsx. Existe porque el layout vive fuera del árbol de
// render de cada página y no puede recibir sus props directamente; este
// contexto es el puente.
export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  return <BreadcrumbContext.Provider value={{ items, setItems }}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbContext(): BreadcrumbContextValue {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumbContext debe usarse dentro de <BreadcrumbProvider>.");
  }
  return ctx;
}
