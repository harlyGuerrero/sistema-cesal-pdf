// Etiquetas de TipoDato compartidas entre las pantallas de Campos y Catálogos
// (Fase 4 de Activos).

export const TIPO_DATO_LABELS: Record<string, string> = {
  TEXTO: "Texto",
  NUMERO_ENTERO: "Número entero",
  NUMERO_DECIMAL: "Número decimal",
  FECHA: "Fecha",
  BOOLEANO: "Sí / No",
  SELECCION: "Selección (catálogo)",
  CATALOGO: "Catálogo",
  URL: "URL",
};

export const TIPO_DATO_OPTIONS = [
  { value: "TEXTO", label: "Texto" },
  { value: "NUMERO_ENTERO", label: "Número entero" },
  { value: "NUMERO_DECIMAL", label: "Número decimal" },
  { value: "FECHA", label: "Fecha" },
  { value: "BOOLEANO", label: "Sí / No" },
  { value: "SELECCION", label: "Selección (catálogo)" },
  { value: "CATALOGO", label: "Catálogo" },
  { value: "URL", label: "URL" },
] as const;

// tipoDato que requieren un Catalogo asociado (ver CampoEspecificacion.catalogoId).
export const TIPOS_DATO_CON_CATALOGO = new Set(["SELECCION", "CATALOGO"]);
