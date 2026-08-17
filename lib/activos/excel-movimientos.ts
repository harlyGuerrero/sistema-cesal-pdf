import ExcelJS from "exceljs";
import { TIPO_MOVIMIENTO_LABELS } from "./labels";
import { describirMovimiento, type MovimientoDetalleRow } from "./movimientos";
import { nombreCompleto } from "@/lib/nombre-completo";
import { ROL_USUARIO_LABELS } from "@/lib/usuarios/labels";
import type { RolUsuario } from "@/lib/generated/prisma/client";

export interface MovimientoExportRow extends MovimientoDetalleRow {
  tipo: string;
  fecha: Date;
  motivo: string | null;
  activo: { nombreActivo: string; codigoPatrimonial: string };
  usuario: { nombres: string; apellidos: string; rol: RolUsuario } | null;
}

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAF0" } };

// Fase 45: misma descripción de cambios (describirMovimiento) que ya usa la
// ficha imprimible de un Activo (historial-section.tsx) — para no
// reimplementar en JSON el "qué cambió" de cada Movimiento, ver comentario
// en movimiento-detalle.tsx sobre por qué esa pantalla usa una versión con
// tarjetas De/A en vez de esta versión en texto plano.
export async function buildMovimientosWorkbook(movimientos: MovimientoExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Patrimonial CESAL";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Movimientos", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Tipo", key: "tipo", width: 22 },
    { header: "Activo", key: "activo", width: 30 },
    { header: "Código patrimonial", key: "codigo", width: 20 },
    { header: "Detalle", key: "detalle", width: 55 },
    { header: "Sede actual", key: "sede", width: 22 },
    { header: "Unidad operativa actual", key: "unidad", width: 24 },
    { header: "Usuario", key: "usuario", width: 28 },
    { header: "Fecha y hora", key: "fecha", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = HEADER_FILL;

  for (const movimiento of movimientos) {
    const sede = movimiento.sedeNueva ?? movimiento.sedeAnterior;
    const unidad = movimiento.unidadOperativaNueva ?? movimiento.unidadOperativaAnterior;
    const lineas = describirMovimiento(movimiento);
    if (movimiento.motivo) lineas.push(`Motivo: ${movimiento.motivo}`);

    sheet.addRow({
      tipo: TIPO_MOVIMIENTO_LABELS[movimiento.tipo] ?? movimiento.tipo,
      activo: movimiento.activo.nombreActivo,
      codigo: movimiento.activo.codigoPatrimonial,
      detalle: lineas.length > 0 ? lineas.join(" | ") : "—",
      sede: sede?.name ?? "—",
      unidad: unidad?.name ?? "—",
      usuario: movimiento.usuario
        ? `${nombreCompleto(movimiento.usuario)} (${ROL_USUARIO_LABELS[movimiento.usuario.rol]})`
        : "—",
      fecha: movimiento.fecha,
    });
  }
  sheet.getColumn("fecha").numFmt = "dd/mm/yyyy hh:mm";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
