import ExcelJS from "exceljs";
import { ESTADO_PATRIMONIAL_LABELS } from "./labels";
import { nombreCompleto } from "@/lib/nombre-completo";
import type { ReporteMatriz } from "./reportes";

export interface ReporteDetalleActivo {
  codigoPatrimonial: string;
  nombreActivo: string;
  tipoActivo: { name: string };
  sede: { name: string } | null;
  unidadOperativa: { name: string } | null;
  ambiente: { name: string } | null;
  responsableActual: { nombres: string; apellidos: string } | null;
  estadoPatrimonial: string;
}

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAF0" } };

// Fase 43: mismas 3 hojas que se ven en /reportes — la matriz por sede (o
// por unidad operativa, con una sede elegida), el detalle completo de
// activos (sin la paginación de la pantalla, igual que exceljs-export.ts
// para /activos) y un resumen con el valor contable total.
export async function buildReporteWorkbook(params: {
  matriz: ReporteMatriz;
  detalle: ReporteDetalleActivo[];
  valorContableTotal: number;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Patrimonial CESAL";
  workbook.created = new Date();

  const matrizSheet = workbook.addWorksheet(params.matriz.sedeSeleccionada ? "Por unidad operativa" : "Por sede");
  const headerLabel = params.matriz.sedeSeleccionada ? "Unidad operativa" : "Sede";
  matrizSheet.columns = [
    { header: headerLabel, key: "label", width: 28 },
    ...params.matriz.columnas.map((c) => ({ header: c.name, key: c.id, width: 20 })),
    { header: "Total", key: "total", width: 12 },
  ];
  matrizSheet.getRow(1).font = { bold: true };
  matrizSheet.getRow(1).fill = HEADER_FILL;

  for (const fila of params.matriz.filas) {
    const row: Record<string, string | number> = { label: fila.label, total: fila.total };
    params.matriz.columnas.forEach((columna, i) => {
      row[columna.id] = fila.counts[i];
    });
    matrizSheet.addRow(row);
  }
  if (params.matriz.filas.length > 0) {
    const totalRow: Record<string, string | number> = { label: "Total", total: params.matriz.totalGeneral };
    params.matriz.columnas.forEach((columna, i) => {
      totalRow[columna.id] = params.matriz.totalesPorColumna[i];
    });
    matrizSheet.addRow(totalRow).font = { bold: true };
  }

  const detalleSheet = workbook.addWorksheet("Detalle de activos");
  detalleSheet.columns = [
    { header: "Código", key: "codigo", width: 20 },
    { header: "Nombre", key: "nombre", width: 32 },
    { header: "Tipo", key: "tipo", width: 22 },
    { header: "Ubicación", key: "ubicacion", width: 32 },
    { header: "Responsable", key: "responsable", width: 26 },
    { header: "Estado", key: "estado", width: 16 },
  ];
  detalleSheet.getRow(1).font = { bold: true };
  detalleSheet.getRow(1).fill = HEADER_FILL;
  for (const activo of params.detalle) {
    detalleSheet.addRow({
      codigo: activo.codigoPatrimonial,
      nombre: activo.nombreActivo,
      tipo: activo.tipoActivo.name,
      ubicacion: [activo.sede?.name, activo.unidadOperativa?.name, activo.ambiente?.name].filter(Boolean).join(" › ") || "—",
      responsable: activo.responsableActual ? nombreCompleto(activo.responsableActual) : "—",
      estado: ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial] ?? activo.estadoPatrimonial,
    });
  }

  const resumenSheet = workbook.addWorksheet("Resumen");
  resumenSheet.columns = [
    { header: "Indicador", key: "indicador", width: 28 },
    { header: "Valor", key: "valor", width: 20 },
  ];
  resumenSheet.getRow(1).font = { bold: true };
  resumenSheet.getRow(1).fill = HEADER_FILL;
  resumenSheet.addRow({ indicador: "Activos filtrados", valor: params.detalle.length });
  const filaValor = resumenSheet.addRow({ indicador: "Valor contable total", valor: params.valorContableTotal });
  filaValor.getCell("valor").numFmt = '"S/" #,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
