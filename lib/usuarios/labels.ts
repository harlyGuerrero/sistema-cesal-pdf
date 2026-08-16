import { ShieldIcon, UserCogIcon, type LucideIcon } from "lucide-react";

// Fase 13: los dos únicos roles del sistema (ver CLAUDE.md).

export const ROL_USUARIO_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN: "Administrador",
};

export const ROL_USUARIO_OPTIONS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "SUPER_ADMIN", label: "Super Administrador" },
] as const;

// Fase 29: ícono + color fijo por rol — mismo criterio estructural que
// IMPORT_STATUS_META/TIPO_ACTIVO_META (color por el valor cerrado del
// campo, nunca por datos del usuario). Reusado por el badge de Rol y el
// avatar en /usuarios.
export const ROL_USUARIO_META: Record<string, { icon: LucideIcon; color: string }> = {
  SUPER_ADMIN: { icon: ShieldIcon, color: "var(--primary)" },
  ADMIN: { icon: UserCogIcon, color: "var(--color-chart-5)" },
};
