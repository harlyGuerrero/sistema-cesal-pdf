"use client";

import * as React from "react";
import { LayoutDashboardIcon, PackageIcon, FileStackIcon } from "lucide-react";

import { NavMain, type NavMainItem } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// Las 3 áreas funcionales del sistema (ver ARCHITECTURE.md sección 1).
const NAV_ITEMS: NavMainItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
  { title: "Productos", url: "/productos", icon: PackageIcon },
  { title: "Importaciones", url: "/importaciones", icon: FileStackIcon },
];

// Sin TeamSwitcher/NavUser del bloque original de shadcn: no hay concepto de
// equipos ni de usuario autenticado todavía (auth fuera de alcance, ver
// CLAUDE.md) — un header estático evita inventar datos de un usuario que no existe.
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <PackageIcon className="size-4" />
              </div>
              <span className="truncate font-medium">Importación de Productos</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={NAV_ITEMS} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
