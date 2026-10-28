import type { EstadoDepreciacion, MotivoOmision } from "./calculo";

// Fase 58: etiquetas y color del estado de depreciación. Los colores reusan
// los tokens semánticos del tema: good = terminó bien (totalmente
// depreciado), primary = en curso, warning = algo que alguien tiene que
// revisar, neutral = todavía no empezó.
export const ESTADO_DEPRECIACION_META: Record<EstadoDepreciacion, { label: string; color: string; descripcion: string }> = {
  PENDIENTE_REVISION: {
    label: "Pendiente de revisión",
    color: "var(--color-warning)",
    descripcion: "Faltan o no cuadran datos del activo (costo, fecha de adquisición o historial).",
  },
  CONFIGURACION_PENDIENTE: {
    label: "Configuración pendiente",
    color: "var(--color-critical)",
    descripcion: "Su tipo de activo no tiene una tasa de depreciación configurada.",
  },
  PENDIENTE_DEPRECIACION: {
    label: "Pendiente de depreciación",
    color: "var(--color-neutral)",
    descripcion: "Datos completos, pero todavía no se procesó ningún trimestre.",
  },
  EN_DEPRECIACION: {
    label: "En depreciación",
    color: "var(--primary)",
    descripcion: "Tiene trimestres registrados y todavía le queda valor por depreciar.",
  },
  TOTALMENTE_DEPRECIADO: {
    label: "Totalmente depreciado",
    color: "var(--color-good)",
    descripcion: "La depreciación acumulada alcanzó el costo original (valor neto S/ 0,00).",
  },
};

export const ESTADO_DEPRECIACION_OPTIONS = (Object.keys(ESTADO_DEPRECIACION_META) as EstadoDepreciacion[]).map(
  (value) => ({ value, label: ESTADO_DEPRECIACION_META[value].label })
);

export const MOTIVO_OMISION_LABELS: Record<MotivoOmision, string> = {
  TOTALMENTE_DEPRECIADO: "Ya totalmente depreciado",
  ADQUIRIDO_DESPUES: "Adquirido después del trimestre",
  DADO_DE_BAJA: "Dado de baja",
};

export const TRIMESTRE_OPTIONS = [
  { value: 1, label: "1.er trimestre (ene–mar)" },
  { value: 2, label: "2.º trimestre (abr–jun)" },
  { value: 3, label: "3.er trimestre (jul–sep)" },
  { value: 4, label: "4.º trimestre (oct–dic)" },
] as const;
