"use client";

import * as React from "react";
import { useTransition } from "react";
import Image from "next/image";
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
  UsersIcon,
  UserCogIcon,
  ScrollTextIcon,
  HistoryIcon,
  FileBarChart2Icon,
  MoonIcon,
  LogOutIcon,
  ChevronsUpDownIcon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { logoutAction } from "@/app/login/actions";
import { ROL_USUARIO_LABELS } from "@/lib/usuarios/labels";
import type { SessionUsuario } from "@/lib/auth/session";

// Las 3 áreas funcionales originales (ver ARCHITECTURE.md sección 1) —
// "Productos" pasó a ser "Activos" en Fase 6: Product se fusionó con Activo
// desde Fase 1, y esta es la pantalla real (antes solo existía /productos,
// una versión mínima heredada del pipeline de PDFs). Fase 12 agrega
// Reportes.
const MAIN_NAV_ITEMS: NavMainItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
  { title: "Activos", url: "/activos", icon: PackageIcon },
  { title: "Importaciones", url: "/importaciones", icon: FileStackIcon },
  { title: "Reportes", url: "/reportes", icon: FileBarChart2Icon },
];

// Fase B (Sedes) + Fase 8 de Activos (Responsables, personas a quien se
// asigna un activo) + Fase 9/12 (Movimientos, vista global del historial
// por Activo) + Fase 11 (Auditoría, log de solo lectura de mutaciones del
// sistema). "Usuarios" se filtra abajo: Fase 13 lo reserva a SUPER_ADMIN.
const ORG_NAV_ITEMS: NavMainItem[] = [
  { title: "Sedes", url: "/sedes", icon: Building2Icon },
  { title: "Responsables", url: "/responsables", icon: UsersIcon },
  { title: "Usuarios", url: "/usuarios", icon: UserCogIcon },
  { title: "Movimientos", url: "/movimientos", icon: HistoryIcon },
  { title: "Auditoría", url: "/auditoria", icon: ScrollTextIcon },
];

// Configuración del módulo de Activos (Fases 2, 3 y 4) — administra la
// taxonomía y los catálogos que consume el formulario de /activos/nuevo.
const ACTIVOS_CONFIG_NAV_ITEMS: NavMainItem[] = [
  { title: "Tipos de Activo", url: "/activos/tipos", icon: TagIcon },
  { title: "Categorías", url: "/activos/categorias", icon: FolderTreeIcon },
  { title: "Campos", url: "/activos/campos", icon: ListTreeIcon },
  { title: "Catálogos", url: "/activos/catalogos", icon: BookMarkedIcon },
];

export function AppSidebar({
  usuario,
  ...props
}: React.ComponentProps<typeof Sidebar> & { usuario: SessionUsuario }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  // resolvedTheme es undefined en el server (next-themes no conoce el tema
  // hasta hidratar) — sin este guard el switch parpadearía "unchecked" en el
  // primer render del cliente aunque el tema real ya sea dark.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const orgNavItems =
    usuario.rol === "SUPER_ADMIN"
      ? ORG_NAV_ITEMS
      : ORG_NAV_ITEMS.filter((item) => item.url !== "/usuarios");

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <Image
                src="/logo-mobile.svg"
                alt="CESAL"
                width={32}
                height={32}
                className="size-8 shrink-0"
              />
              <Image
                src="/logo-desktop.svg"
                alt="CESAL"
                width={132}
                height={36}
                className="h-5 w-auto group-data-[collapsible=icon]:hidden"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={MAIN_NAV_ITEMS} label="Principal" />
        <NavMain items={ACTIVOS_CONFIG_NAV_ITEMS} label="Configuración de Activos" />
        <NavMain items={orgNavItems} label="Organización" />
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
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg">
                    <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                      {usuario.nombre.slice(0, 2)}
                    </div>
                    <div className="flex min-w-0 flex-col text-left leading-tight">
                      <span className="truncate text-sm font-medium">{usuario.nombre}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {ROL_USUARIO_LABELS[usuario.rol]}
                      </span>
                    </div>
                    <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                    {usuario.email}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={() => startTransition(() => logoutAction())}
                >
                  <LogOutIcon />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
