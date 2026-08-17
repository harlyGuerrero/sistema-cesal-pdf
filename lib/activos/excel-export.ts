import ExcelJS from "exceljs";
import { ACTIVO_EXCEL_COLUMNS } from "./excel-columns";
import { ESTADO_PATRIMONIAL_LABELS, CONDICION_FISICA_LABELS } from "./labels";

export interface ActivoExportRow {
  codigoPatrimonial: string;
  nombreActivo: string;
  tipoActivo: { name: string };
  sede: { name: string } | null;
  unidadOperativa: { name: string } | null;
  ambiente: { name: string } | null;
  proveedor: { razonSocial: string } | null;
  fechaAdquisicion: Date | null;
  numeroFactura: string | null;
  codigoProyecto: string | null;
  costoAdquisicion: { toString(): string } | null;
  valorContable: { toString(): string } | null;
  valorActual: { toString(): string } | null;
  estadoPatrimonial: string;
  condicionFisica: string | null;
  descripcion: string | null;
  observaciones: string | null;
}

function numero(value: { toString(): string } | null): number | null {
  return value === null ? null : Number(value.toString());
}

// Fase 40: workbook de exportación — misma lista de columnas que la
// plantilla de importación (ver excel-columns.ts), así el archivo exportado
// se puede re-importar tal cual para editar en lote (exportar -> editar en
// Excel -> importar).
export async function buildActivosWorkbook(activos: ActivoExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Patrimonial CESAL";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Activos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = ACTIVO_EXCEL_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.ancho,
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAF0" } };

  for (const activo of activos) {
    sheet.addRow({
      codigoPatrimonial: activo.codigoPatrimonial,
      nombreActivo: activo.nombreActivo,
      tipoActivo: activo.tipoActivo.name,
      sede: activo.sede?.name ?? "",
      unidadOperativa: activo.unidadOperativa?.name ?? "",
      ambiente: activo.ambiente?.name ?? "",
      proveedor: activo.proveedor?.razonSocial ?? "",
      fechaAdquisicion: activo.fechaAdquisicion,
      numeroFactura: activo.numeroFactura ?? "",
      codigoProyecto: activo.codigoProyecto ?? "",
      costoAdquisicion: numero(activo.costoAdquisicion),
      valorContable: numero(activo.valorContable),
      valorActual: numero(activo.valorActual),
      estadoPatrimonial: ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial] ?? activo.estadoPatrimonial,
      condicionFisica: activo.condicionFisica ? (CONDICION_FISICA_LABELS[activo.condicionFisica] ?? activo.condicionFisica) : "",
      descripcion: activo.descripcion ?? "",
      observaciones: activo.observaciones ?? "",
    });
  }

  const fechaCol = sheet.getColumn("fechaAdquisicion");
  fechaCol.numFmt = "dd/mm/yyyy";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
