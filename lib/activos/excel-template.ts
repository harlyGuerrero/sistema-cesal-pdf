import ExcelJS from "exceljs";
import { ACTIVO_EXCEL_COLUMNS } from "./excel-columns";
import { ESTADO_PATRIMONIAL_OPTIONS, CONDICION_FISICA_OPTIONS } from "./labels";

export interface PlantillaReferencias {
  tiposActivo: string[];
  sedes: string[];
}

// Fase 40: plantilla descargable para la importación masiva de activos —
// mismas columnas que excel-export.ts (para que "exportar -> editar ->
// re-importar" funcione con el mismo archivo), más una fila de ejemplo y una
// segunda hoja con los valores válidos de cada columna cerrada (Tipo de
// activo/Estado/Condición) y las Sedes existentes, para reducir errores de
// tipeo antes de subir el archivo.
export async function buildActivoImportTemplateWorkbook(referencias: PlantillaReferencias): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Patrimonial CESAL";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Activos");
  sheet.columns = ACTIVO_EXCEL_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.ancho,
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAF0" } };

  sheet.addRow({
    codigoPatrimonial: "",
    nombreActivo: "Ejemplo: Laptop Lenovo V15",
    tipoActivo: referencias.tiposActivo[0] ?? "Equipos Informáticos",
    sede: referencias.sedes[0] ?? "",
    unidadOperativa: "",
    ambiente: "",
    proveedor: "",
    fechaAdquisicion: new Date(),
    numeroFactura: "",
    codigoProyecto: "",
    costoAdquisicion: 0,
    valorContable: 0,
    valorActual: 0,
    estadoPatrimonial: ESTADO_PATRIMONIAL_OPTIONS[0].label,
    condicionFisica: "",
    descripcion: "",
    observaciones: "Borra esta fila de ejemplo antes de subir el archivo.",
  });
  sheet.getColumn("fechaAdquisicion").numFmt = "dd/mm/yyyy";

  const ref = workbook.addWorksheet("Valores válidos");
  ref.columns = [
    { header: "Código patrimonial", key: "info", width: 70 },
    { header: "Tipo de activo", key: "tipo", width: 24 },
    { header: "Estado patrimonial", key: "estado", width: 20 },
    { header: "Condición física", key: "condicion", width: 18 },
    { header: "Sede", key: "sede", width: 24 },
  ];
  ref.getRow(1).font = { bold: true };
  ref.addRow({
    info:
      "Dejar la columna \"Código patrimonial\" vacía crea un activo nuevo (se genera automáticamente). " +
      "Si pones un código que ya existe, ese activo se actualiza con los datos de la fila. " +
      "Si pones un código que no existe, la fila se rechaza — no inventes códigos a mano.",
  });

  const maxRows = Math.max(referencias.tiposActivo.length, ESTADO_PATRIMONIAL_OPTIONS.length, CONDICION_FISICA_OPTIONS.length, referencias.sedes.length);
  for (let i = 0; i < maxRows; i++) {
    ref.addRow({
      tipo: referencias.tiposActivo[i] ?? "",
      estado: ESTADO_PATRIMONIAL_OPTIONS[i]?.label ?? "",
      condicion: CONDICION_FISICA_OPTIONS[i]?.label ?? "",
      sede: referencias.sedes[i] ?? "",
    });
  }
  ref.mergeCells(2, 1, maxRows + 1, 1);
  ref.getCell(2, 1).alignment = { wrapText: true, vertical: "top" };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
