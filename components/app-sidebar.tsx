"use client";

import * as React from "react";
import { useTransition } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
  MoreVerticalIcon,
} from "lucide-react";

import { NavMain, resolveActiveUrl, type NavMainItem } from "@/components/nav-main";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  // Un único resuelto contra los 3 grupos a la vez (ver resolveActiveUrl en
  // nav-main.tsx) — evita que "Activos" (Principal) y, por ejemplo, "Tipos
  // de Activo" (Configuración) queden activos los dos al mismo tiempo en
  // /activos/tipos, porque "/activos" es prefijo de esa URL.
  const pathname = usePathname();
  const activeUrl = resolveActiveUrl(pathname, [...MAIN_NAV_ITEMS, ...ACTIVOS_CONFIG_NAV_ITEMS, ...orgNavItems]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="pt-3">
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <Image
                src="/logo-mobile.svg"
                alt="CESAL"
                width={32}
                height={32}
                className="
                hidden h-10 w-10 rounded-full object-contain
                group-data-[collapsible=icon]:block"
                
              />
              <Image
                src="/logo-desktop.svg"
                alt="CESAL"
                width={132}
                height={36}
                className="
                h-12 w-full object-contain
                group-data-[collapsible=icon]:hidden"
              />
              
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={MAIN_NAV_ITEMS} label="Principal" activeUrl={activeUrl} />
        <NavMain items={ACTIVOS_CONFIG_NAV_ITEMS} label="Configuración de Activos" activeUrl={activeUrl} />
        <NavMain items={orgNavItems} label="Organización" activeUrl={activeUrl} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 rounded-lg p-2 group-data-[collapsible=icon]:hidden">
          <Label htmlFor="dark-mode" className="flex items-center gap-2 text-sm text-gray-600 font-semibold dark:text-blue-50">
            <MoonIcon className="size-4 text-muted-foreground dark:text-green-600" />
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
                  <SidebarMenuButton
                    size="lg"
                    className="rounded-xl border border-sidebar-border bg-card shadow-sm hover:bg-card data-active:bg-card group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none"
                  >
                    <Avatar className="size-8 shrink-0 rounded-full">
                      <AvatarFallback className="rounded-full bg-muted text-xs font-semibold uppercase">
                        {usuario.nombre.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col text-left leading-tight">
                      <span className="truncate text-sm font-semibold">{usuario.nombre}</span>
                      <span className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        {ROL_USUARIO_LABELS[usuario.rol]}
                      </span>
                    </div>
                    <MoreVerticalIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
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
                  className={"text-red-600"}
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
