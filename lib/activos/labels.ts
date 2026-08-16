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

// Fase 10 de Activos: documentos adjuntos.
export const TIPO_DOCUMENTO_OPTIONS = [
  { value: "FACTURA", label: "Factura" },
  { value: "COMPROBANTE", label: "Comprobante" },
  { value: "ACTA_ENTREGA", label: "Acta de entrega" },
  { value: "ACTA_ASIGNACION", label: "Acta de asignación" },
  { value: "ACTA_TRANSFERENCIA", label: "Acta de transferencia" },
  { value: "DOCUMENTO_BAJA", label: "Documento de baja" },
  { value: "GARANTIA", label: "Garantía" },
  { value: "FICHA_TECNICA", label: "Ficha técnica" },
  { value: "CERTIFICADO", label: "Certificado" },
  { value: "FOTOGRAFIA", label: "Fotografía" },
  { value: "OTRO", label: "Otro" },
] as const;

export const TIPO_DOCUMENTO_LABELS: Record<string, string> = Object.fromEntries(
  TIPO_DOCUMENTO_OPTIONS.map((option) => [option.value, option.label])
);

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

// Fase 12 de Activos: filtro de tipo en la vista global de movimientos.
export const TIPO_MOVIMIENTO_OPTIONS = Object.entries(TIPO_MOVIMIENTO_LABELS).map(
  ([value, label]) => ({ value, label })
);

// Fase 15: etiqueta corta para el chip de color de MovimientoBadge — más
// compacta que TIPO_MOVIMIENTO_LABELS (ej. "Transferencia de sede" → "SEDE").
export const TIPO_MOVIMIENTO_TAG_LABELS: Record<string, string> = {
  ALTA: "Alta",
  ASIGNACION: "Asignación",
  REASIGNACION: "Reasignación",
  CAMBIO_RESPONSABLE: "Responsable",
  TRANSFERENCIA: "Sede",
  CAMBIO_UBICACION: "Ubicación",
  MANTENIMIENTO: "Mantenimiento",
  RETORNO_MANTENIMIENTO: "Reintegración",
  BAJA: "Baja",
  REACTIVACION: "Reactivación",
};

// Orden canónico de las 6 categorías patrimoniales (ver ARCHITECTURE.md 5.2).
// Compartido entre el Dashboard y el reporte de inventario (Fase 12) para no
// repetir el mismo orden fijo en dos lugares.
export const TIPO_ACTIVO_CODE_ORDER = [
  "EQUIPOS_INFORMATICOS",
  "EQUIPOS_DE_OFICINA",
  "MUEBLES_DE_OFICINA",
  "BIENES_VEHICULARES",
  "EQUIPOS_DE_MAQUINARIA",
  "BIENES_INMUEBLES",
] as const;
