"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
