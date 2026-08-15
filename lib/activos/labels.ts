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

// Fase 6 de Activos: estado patrimonial (situación) vs. condición física
// (estado observado) — dos conceptos distintos, no mezclar (ver
// planificación de Activos §4).
export const ESTADO_PATRIMONIAL_OPTIONS = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "ASIGNADO", label: "Asignado" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "BAJA", label: "Baja" },
] as const;

export const ESTADO_PATRIMONIAL_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible",
  ASIGNADO: "Asignado",
  MANTENIMIENTO: "Mantenimiento",
  BAJA: "Baja",
};

export const CONDICION_FISICA_OPTIONS = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "BUENO", label: "Bueno" },
  { value: "REGULAR", label: "Regular" },
  { value: "MALO", label: "Malo" },
  { value: "DETERIORADO", label: "Deteriorado" },
] as const;

export const CONDICION_FISICA_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  BUENO: "Bueno",
  REGULAR: "Regular",
  MALO: "Malo",
  DETERIORADO: "Deteriorado",
};

// Fase 9 de Activos: historial de movimientos.
export const TIPO_MOVIMIENTO_LABELS: Record<string, string> = {
  ALTA: "Alta",
  ASIGNACION: "Asignación",
  REASIGNACION: "Reasignación",
  CAMBIO_RESPONSABLE: "Cambio de responsable",
  TRANSFERENCIA: "Transferencia de sede",
  CAMBIO_UBICACION: "Cambio de ubicación",
  MANTENIMIENTO: "Mantenimiento",
  RETORNO_MANTENIMIENTO: "Retorno de mantenimiento",
  BAJA: "Baja",
  REACTIVACION: "Reactivación",
};
