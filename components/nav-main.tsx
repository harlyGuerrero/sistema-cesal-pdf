"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export interface NavMainItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Resuelve un único ítem activo entre TODOS los grupos del nav a la vez
// (Principal, Configuración de Activos, Organización), no grupo por grupo.
// Antes cada NavMain comparaba pathname.startsWith(item.url) solo contra
// sus propios items, así que en /activos/tipos tanto "Activos" (Principal,
// url "/activos") como "Tipos de Activo" (Configuración, url
// "/activos/tipos") quedaban resaltados a la vez, porque "/activos" es
// prefijo de las 4 URLs de Configuración de Activos. Acá se compara contra
// TODOS los items y gana el match más específico (el url más largo), con
// límite de segmento (url exacto o seguido de "/") para no confundir
// "/activos" con algo como "/activos-viejos".
export function resolveActiveUrl(pathname: string, items: NavMainItem[]): string | null {
  let best: string | null = null;
  for (const item of items) {
    const matches =
      item.url === "/" ? pathname === "/" : pathname === item.url || pathname.startsWith(`${item.url}/`);
    if (matches && (best === null || item.url.length > best.length)) {
      best = item.url;
    }
  }
  return best;
}

// Links directos a las 3 áreas funcionales (ver ARCHITECTURE.md) — sin
// submenú colapsable, a diferencia del bloque sidebar-07 original, porque
// ninguna tiene páginas hijas que mostrar en el sidebar.
//
// Estado activo (referencia visual del usuario): píldora clara con sombra,
// barra izquierda y texto/ícono en azul — sobrescribe el estilo por
// defecto de sidebarMenuButtonVariants (gris plano) vía className en vez de
// tocar el primitive compartido de components/ui/sidebar.tsx. activeUrl lo
// calcula AppSidebar una sola vez contra todos los grupos (ver
// resolveActiveUrl) — este componente ya no decide por su cuenta.
export function NavMain({
  items,
  label,
  activeUrl,
}: {
  items: NavMainItem[];
  label?: string;
  activeUrl: string | null;
}) {
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const isActive = item.url === activeUrl;
          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={item.title}
                render={<Link href={item.url} />}
                className={cn(
                  "relative rounded-xl py-5 transition-colors text-gray-600 font-semibold dark:text-blue-50",
                  isActive &&
                    "bg-card font-semibold text-primary shadow-sm hover:bg-card dark:text-blue-700 border-l-5 border-l-blue-700 hover:text-primary data-active:bg-card data-active:text-primary"
                )}
              >
                <item.icon className={isActive ? "text-primary" : undefined} />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
