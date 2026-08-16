// Fase 13: los dos únicos roles del sistema (ver CLAUDE.md).

export const ROL_USUARIO_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN: "Administrador",
};

export const ROL_USUARIO_OPTIONS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "SUPER_ADMIN", label: "Super Administrador" },
] as const;
