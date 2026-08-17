// Fase 40: columnas del Excel de activos, únicas para exportación, plantilla
// e importación — que las tres lean de acá evita que se desalineen (ej. un
// encabezado que cambia en la plantilla pero no en el parser de import).
// Alcance v1 (decisión explícita del usuario): solo campos base del Activo,
// sin especificaciones dinámicas por subcategoría ni Responsable — ver
// README de la sección "Importar/Exportar" en la skill import-workflow.
export interface ActivoExcelColumn {
  key: string;
  header: string;
  requerido: boolean;
  ancho: number;
}

export const ACTIVO_EXCEL_COLUMNS: ActivoExcelColumn[] = [
  { key: "codigoPatrimonial", header: "Código patrimonial", requerido: false, ancho: 20 },
  { key: "nombreActivo", header: "Nombre del activo *", requerido: true, ancho: 32 },
  { key: "tipoActivo", header: "Tipo de activo *", requerido: true, ancho: 24 },
  { key: "sede", header: "Sede", requerido: false, ancho: 22 },
  { key: "unidadOperativa", header: "Unidad operativa", requerido: false, ancho: 22 },
  { key: "ambiente", header: "Ambiente", requerido: false, ancho: 20 },
  { key: "proveedor", header: "Proveedor", requerido: false, ancho: 26 },
  { key: "fechaAdquisicion", header: "Fecha de adquisición", requerido: false, ancho: 18 },
  { key: "numeroFactura", header: "N° de factura", requerido: false, ancho: 18 },
  { key: "codigoProyecto", header: "Código de proyecto", requerido: false, ancho: 18 },
  { key: "costoAdquisicion", header: "Costo de adquisición", requerido: false, ancho: 18 },
  { key: "valorContable", header: "Valor contable", requerido: false, ancho: 16 },
  { key: "valorActual", header: "Valor actual", requerido: false, ancho: 16 },
  { key: "estadoPatrimonial", header: "Estado patrimonial", requerido: false, ancho: 18 },
  { key: "condicionFisica", header: "Condición física", requerido: false, ancho: 16 },
  { key: "descripcion", header: "Descripción", requerido: false, ancho: 32 },
  { key: "observaciones", header: "Observaciones", requerido: false, ancho: 32 },
];

// Quita el "*" que marca obligatorio en el encabezado, para matchear el
// texto de la celda contra `header` sin importar si el usuario lo dejó.
export function normalizarEncabezado(valor: string): string {
  return valor.replace(/\s*\*\s*$/, "").trim().toLowerCase();
}
