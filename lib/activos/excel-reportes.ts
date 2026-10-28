import ExcelJS from "exceljs";
import { ESTADO_PATRIMONIAL_LABELS } from "./labels";
import { nombreCompleto } from "@/lib/nombre-completo";
import type { MontosReporte, ReporteMatriz } from "./reportes";

export interface ReporteDetalleActivo {
  id: string;
  codigoPatrimonial: string;
  nombreActivo: string;
  tipoActivo: { name: string };
  sede: { name: string } | null;
  unidadOperativa: { name: string } | null;
  ambiente: { name: string } | null;
  responsableActual: { nombres: string; apellidos: string } | null;
  numeroFactura: string | null;
  numeroFC: string | null;
  estadoPatrimonial: string;
}

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAF0" } };
const SOLES = '"S/" #,##0.00';

function soles(centavos: number | null | undefined): number | null {
  return centavos === null || centavos === undefined ? null : centavos / 100;
}

// Fase 43, ampliada en Fase 59: las mismas hojas que se ven en /reportes —
// la matriz por sede (o por unidad operativa, con una sede elegida) con su
// costo y valor neto, el desglose de activos (la celda elegida, o todo, sin
// la paginación de la pantalla) y un resumen que declara de dónde salen los
// montos. Mismo costo y valor neto que la pantalla (cargarMontosReporte).
export async function buildReporteWorkbook(params: {
  matriz: ReporteMatriz;
  montos: MontosReporte;
  detalle: ReporteDetalleActivo[];
  tituloDesglose: string;
  filtros: string;
  corte: string | null;
  generadoPor: string;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Patrimonial CESAL";
  workbook.created = new Date();

  const resumenSheet = workbook.addWorksheet("Resumen");
  resumenSheet.columns = [
    { header: "Dato", key: "indicador", width: 34 },
    { header: "Valor", key: "valor", width: 40 },
  ];
  resumenSheet.getRow(1).font = { bold: true };
  resumenSheet.getRow(1).fill = HEADER_FILL;
  resumenSheet.addRow({ indicador: "Filtros", valor: params.filtros });
  resumenSheet.addRow({ indicador: "Generado", valor: `${new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" })} por ${params.generadoPor}` });
  resumenSheet.addRow({ indicador: "Activos", valor: params.matriz.totalGeneral });
  resumenSheet.addRow({ indicador: "Costo de adquisición", valor: soles(params.montos.costoCentavos) }).getCell("valor").numFmt = SOLES;
  resumenSheet.addRow({ indicador: "Valor neto contable", valor: soles(params.montos.valorNetoCentavos) }).getCell("valor").numFmt = SOLES;
  resumenSheet.addRow({ indicador: "Depreciación registrada hasta", valor: params.corte ?? "Ningún trimestre procesado" });
  resumenSheet.addRow({ indicador: "Activos sin costo (no suman a los montos)", valor: params.montos.sinCosto });
  resumenSheet.addRow({ indicador: "Valor neto", valor: "Costo de adquisición menos la depreciación registrada" });

  const matrizSheet = workbook.addWorksheet(params.matriz.sedeSeleccionada ? "Por unidad operativa" : "Por sede");
  matrizSheet.columns = [
    { header: params.matriz.sedeSeleccionada ? "Unidad operativa" : "Sede", key: "label", width: 28 },
    ...params.matriz.columnas.map((c) => ({ header: c.name, key: c.id, width: 20 })),
    { header: "Total", key: "total", width: 12 },
    { header: "Costo", key: "costo", width: 18, style: { numFmt: SOLES } },
    { header: "Valor neto", key: "valorNeto", width: 18, style: { numFmt: SOLES } },
  ];
  matrizSheet.getRow(1).font = { bold: true };
  matrizSheet.getRow(1).fill = HEADER_FILL;

  for (const fila of params.matriz.filas) {
    const monto = params.montos.porFila.get(fila.key);
    const row: Record<string, string | number | null> = {
      label: fila.label,
      total: fila.total,
      costo: soles(monto?.costoCentavos ?? 0),
      valorNeto: soles(monto?.valorNetoCentavos ?? 0),
    };
    params.matriz.columnas.forEach((columna, i) => {
      row[columna.id] = fila.counts[i];
    });
    matrizSheet.addRow(row);
  }
  if (params.matriz.filas.length > 0) {
    const totalRow: Record<string, string | number | null> = {
      label: "Total",
      total: params.matriz.totalGeneral,
      costo: soles(params.montos.costoCentavos),
      valorNeto: soles(params.montos.valorNetoCentavos),
    };
    params.matriz.columnas.forEach((columna, i) => {
      totalRow[columna.id] = params.matriz.totalesPorColumna[i];
    });
    matrizSheet.addRow(totalRow).font = { bold: true };
  }

  const detalleSheet = workbook.addWorksheet("Detalle de activos");
  detalleSheet.addRow([params.tituloDesglose]).font = { bold: true };
  detalleSheet.addRow([]);
  const encabezados = ["Activo", "Código", "Tipo", "Ubicación", "Responsable", "Estado", "N° de factura", "N° FC", "Costo", "Valor neto"];
  const header = detalleSheet.addRow(encabezados);
  header.font = { bold: true };
  header.fill = HEADER_FILL;
  [32, 20, 26, 34, 26, 16, 18, 14, 16, 16].forEach((ancho, i) => {
    detalleSheet.getColumn(i + 1).width = ancho;
  });
  detalleSheet.getColumn(9).numFmt = SOLES;
  detalleSheet.getColumn(10).numFmt = SOLES;
  for (const activo of params.detalle) {
    const monto = params.montos.porActivo.get(activo.id);
    detalleSheet.addRow([
      activo.nombreActivo,
      activo.codigoPatrimonial,
      activo.tipoActivo.name,
      [activo.sede?.name, activo.unidadOperativa?.name, activo.ambiente?.name].filter(Boolean).join(" › ") || "Sin ubicación registrada",
      activo.responsableActual ? nombreCompleto(activo.responsableActual) : "Sin responsable",
      ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial] ?? activo.estadoPatrimonial,
      activo.numeroFactura ?? "",
      activo.numeroFC ?? "",
      soles(monto?.costoCentavos),
      soles(monto?.valorNetoCentavos),
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
