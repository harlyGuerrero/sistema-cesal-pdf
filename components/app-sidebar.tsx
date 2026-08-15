"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboardIcon,
  PackageIcon,
  FileStackIcon,
  Building2Icon,
  TagIcon,
  FolderTreeIcon,
  ListTreeIcon,
  BookMarkedIcon,
  MoonIcon,
} from "lucide-react";

import { NavMain, type NavMainItem } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Las 3 áreas funcionales originales (ver ARCHITECTURE.md sección 1).
const MAIN_NAV_ITEMS: NavMainItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
  { title: "Productos", url: "/productos", icon: PackageIcon },
  { title: "Importaciones", url: "/importaciones", icon: FileStackIcon },
];

// Fase B: catálogo de sedes, todavía sin relación a Activo.
const ORG_NAV_ITEMS: NavMainItem[] = [
  { title: "Sedes", url: "/sedes", icon: Building2Icon },
];

// Fase 2 (tipos, solo lectura) + Fase 3 (categorías/subcategorías) + Fase 4
// (campos dinámicos y catálogos) de Activos. El listado real de Activos
// llega en Fase 6.
const ACTIVOS_NAV_ITEMS: NavMainItem[] = [
  { title: "Tipos de Activo", url: "/activos/tipos", icon: TagIcon },
  { title: "Categorías", url: "/activos/categorias", icon: FolderTreeIcon },
  { title: "Campos", url: "/activos/campos", icon: ListTreeIcon },
  { title: "Catálogos", url: "/activos/catalogos", icon: BookMarkedIcon },
];

// Sin NavUser: no hay concepto de usuario autenticado todavía (auth fuera de
// alcance de esta fase, ver CLAUDE.md) — un footer sin usuario evita inventar
// datos de una sesión que no existe. El toggle de modo oscuro sí es real,
// respaldado por next-themes (ver components/theme-provider.tsx).
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  // resolvedTheme es undefined en el server (next-themes no conoce el tema
  // hasta hidratar) — sin este guard el switch parpadearía "unchecked" en el
  // primer render del cliente aunque el tema real ya sea dark.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                C
              </div>
              <span className="flex items-baseline gap-1 truncate">
                <span className="text-base font-bold text-foreground">cesal</span>
                <span className="rounded-sm bg-good px-1 text-[10px] font-bold text-white">
                  ONG
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={MAIN_NAV_ITEMS} label="Principal" />
        <NavMain items={ACTIVOS_NAV_ITEMS} label="Activos" />
        <NavMain items={ORG_NAV_ITEMS} label="Organización" />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 rounded-lg p-2 group-data-[collapsible=icon]:hidden">
          <Label htmlFor="dark-mode" className="flex items-center gap-2 text-sm font-normal">
            <MoonIcon className="size-4 text-muted-foreground" />
            Modo Oscuro
          </Label>
          <Switch
            id="dark-mode"
            checked={mounted && resolvedTheme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
