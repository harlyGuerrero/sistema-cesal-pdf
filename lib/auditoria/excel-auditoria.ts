import ExcelJS from "exceljs";
import { TIPO_ACCION_AUDITORIA_LABELS } from "./labels";
import { describirDetalleAuditoria } from "./describir-detalle";
import { nombreCompleto } from "@/lib/nombre-completo";

export interface AuditoriaExportRow {
  fecha: Date;
  accion: string;
  entidad: string;
  detalle: unknown;
  usuario: { nombres: string; apellidos: string } | null;
}

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAF0" } };

// Fase 45: misma oración legible (describirDetalleAuditoria) que ya arma el
// texto de cada fila en /auditoria — no reimplementa el volcado del JSON de
// detalle acá.
export async function buildAuditoriaWorkbook(logs: AuditoriaExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Patrimonial CESAL";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Auditoría", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Fecha y hora", key: "fecha", width: 20 },
    { header: "Acción", key: "accion", width: 20 },
    { header: "Entidad", key: "entidad", width: 16 },
    { header: "Detalle", key: "detalle", width: 60 },
    { header: "Usuario", key: "usuario", width: 28 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = HEADER_FILL;

  for (const log of logs) {
    sheet.addRow({
      fecha: log.fecha,
      accion: TIPO_ACCION_AUDITORIA_LABELS[log.accion] ?? log.accion,
      entidad: log.entidad,
      detalle: describirDetalleAuditoria(log.entidad, log.accion, log.detalle),
      usuario: log.usuario ? nombreCompleto(log.usuario) : "—",
    });
  }
  sheet.getColumn("fecha").numFmt = "dd/mm/yyyy hh:mm";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
