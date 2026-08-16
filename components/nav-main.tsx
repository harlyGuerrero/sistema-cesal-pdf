"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

// Links directos a las 3 áreas funcionales (ver ARCHITECTURE.md) — sin
// submenú colapsable, a diferencia del bloque sidebar-07 original, porque
// ninguna tiene páginas hijas que mostrar en el sidebar.
//
// Estado activo (referencia visual del usuario): píldora clara con sombra,
// barra izquierda y texto/ícono en azul — sobrescribe el estilo por
// defecto de sidebarMenuButtonVariants (gris plano) vía className en vez de
// tocar el primitive compartido de components/ui/sidebar.tsx.
export function NavMain({
  items,
  label,
}: {
  items: NavMainItem[];
  label?: string;
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={item.title}
                render={<Link href={item.url} />}
                className={cn(
                  "relative rounded-xl transition-colors",
                  isActive &&
                    "bg-card font-semibold text-primary shadow-sm hover:bg-card hover:text-primary data-active:bg-card data-active:text-primary"
                )}
              >
                {isActive && (
                  <span className="absolute top-1/2 left-0 h-4/5 w-1 -translate-y-1/2 rounded-full bg-primary" />
                )}
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
