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
} from "lucide-react";
import type { NavMainItem as NavItem } from "@/components/nav-main";

export type { NavItem };

// Fase 28: fuente única de las 3 áreas de navegación — antes vivían solo
// dentro de AppSidebar; se movieron acá para que BreadcrumbSlot pueda
// resolver el nombre del módulo actual contra la misma lista, sin duplicar
// título/url en dos lugares que podrían desincronizarse.
export const MAIN_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
  { title: "Activos", url: "/activos", icon: PackageIcon },
  { title: "Importaciones", url: "/importaciones", icon: FileStackIcon },
  { title: "Reportes", url: "/reportes", icon: FileBarChart2Icon },
];

export const ORG_NAV_ITEMS: NavItem[] = [
  { title: "Sedes", url: "/sedes", icon: Building2Icon },
  { title: "Responsables", url: "/responsables", icon: UsersIcon },
  { title: "Usuarios", url: "/usuarios", icon: UserCogIcon },
  { title: "Movimientos", url: "/movimientos", icon: HistoryIcon },
  { title: "Auditoría", url: "/auditoria", icon: ScrollTextIcon },
];

export const ACTIVOS_CONFIG_NAV_ITEMS: NavItem[] = [
  { title: "Tipos de Activo", url: "/activos/tipos", icon: TagIcon },
  { title: "Categorías", url: "/activos/categorias", icon: FolderTreeIcon },
  { title: "Campos", url: "/activos/campos", icon: ListTreeIcon },
  { title: "Catálogos", url: "/activos/catalogos", icon: BookMarkedIcon },
];

export const ALL_NAV_ITEMS: NavItem[] = [
  ...MAIN_NAV_ITEMS,
  ...ACTIVOS_CONFIG_NAV_ITEMS,
  ...ORG_NAV_ITEMS,
];
