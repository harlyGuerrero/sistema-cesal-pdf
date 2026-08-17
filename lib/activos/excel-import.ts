import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalization/normalize";
import { generarCodigoPatrimonial } from "./codigo-patrimonial";
import {
  buildMovimientoDeAlta,
  buildMovimientoDeEdicion,
  movimientoTipoAAccionAuditoria,
} from "./movimientos";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { ACTIVO_EXCEL_COLUMNS, normalizarEncabezado } from "./excel-columns";
import { ESTADO_PATRIMONIAL_OPTIONS, CONDICION_FISICA_OPTIONS } from "./labels";
import { MAX_EXCEL_ROWS } from "@/lib/security/excel-validation";
import type { CondicionFisica, EstadoPatrimonial, TipoActivoCode } from "@/lib/generated/prisma/client";

export class ExcelImportError extends Error {}

interface ResolvedActivoRow {
  activoId: string | null; // null cuando action === "crear"
  nombreActivo: string;
  tipoActivoId: string;
  tipoActivoCode: TipoActivoCode;
  sedeId: string | null;
  unidadOperativaId: string | null;
  ambienteId: string | null;
  proveedorId: string | null;
  fechaAdquisicion: Date | null;
  numeroFactura: string | null;
  codigoProyecto: string | null;
  costoAdquisicion: number | null;
  valorContable: number | null;
  valorActual: number | null;
  estadoPatrimonial: EstadoPatrimonial;
  condicionFisica: CondicionFisica | null;
  descripcion: string | null;
  observaciones: string | null;
}

export interface ActivoImportRowOk {
  rowNumber: number;
  status: "ok";
  action: "crear" | "actualizar";
  nombreActivo: string;
  codigoPatrimonial: string | null;
  resumen: string[];
  data: ResolvedActivoRow;
}

export interface ActivoImportRowError {
  rowNumber: number;
  status: "error";
  nombreActivo: string;
  errores: string[];
}

export type ActivoImportRow = ActivoImportRowOk | ActivoImportRowError;

export interface ActivoImportPreview {
  totalFilas: number;
  crear: number;
  actualizar: number;
  conError: number;
  filas: ActivoImportRow[];
}

function texto(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text).trim() || null;
  if (typeof value === "object" && "result" in value) return texto((value as { result: ExcelJS.CellValue }).result);
  const str = String(value).trim();
  return str === "" ? null : str;
}

// NaN de retorno = "la celda trae algo, pero no es un número" (el caller lo
// reporta como error). null = celda vacía, no es un error.
function numeroCelda(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function numeroDecimal(value: { toString(): string } | null): number | null {
  return value === null ? null : Number(value.toString());
}

function fechaCelda(value: ExcelJS.CellValue): Date | null | "invalida" {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  const str = texto(value);
  if (!str) return null;
  const match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(parsed.getTime()) ? "invalida" : parsed;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? "invalida" : parsed;
}

function porEtiqueta(opciones: readonly { value: string; label: string }[], etiqueta: string): string | null {
  const normalizado = etiqueta.trim().toLowerCase();
  return opciones.find((o) => o.label.toLowerCase() === normalizado || o.value.toLowerCase() === normalizado)?.value ?? null;
}

// Fase 40: analiza el .xlsx sin escribir nada en la base — separado de
// commitActivosImport a propósito, para poder mostrar una vista previa
// (cuántas filas se van a crear/actualizar, y el detalle de cada error)
// antes de que el usuario confirme la importación.
//
// Semántica de celda vacía en una fila que ACTUALIZA (código patrimonial
// existente): "no cambiar este campo", no "borrar el valor" — así una
// planilla con solo Código + una columna sirve para editar en lote sin
// tener que reescribir todos los demás campos. En una fila que CREA, celda
// vacía es simplemente el valor por defecto/null de ese campo.
export async function parseActivosWorkbook(buffer: Buffer): Promise<ActivoImportPreview> {
  const workbook = new ExcelJS.Workbook();
  // exceljs declara su propio tipo local "Buffer" (interface Buffer extends
  // ArrayBuffer, ámbito de su propio .d.ts) que no es el Buffer real de
  // Node/@types/node — nominalmente incompatibles aunque se llamen igual.
  // Parameters<> extrae el tipo que exceljs realmente espera sin tener que
  // nombrarlo (no está exportado) y sin usar `any`. En runtime es el Buffer
  // real de Node, sin problema.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ExcelImportError("El archivo no tiene ninguna hoja.");

  const columnIndexByKey = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const encabezado = normalizarEncabezado(texto(cell.value) ?? "");
    const columna = ACTIVO_EXCEL_COLUMNS.find((c) => normalizarEncabezado(c.header) === encabezado);
    if (columna) columnIndexByKey.set(columna.key, colNumber);
  });

  const faltantes = ACTIVO_EXCEL_COLUMNS.filter((c) => c.requerido && !columnIndexByKey.has(c.key));
  if (faltantes.length > 0) {
    throw new ExcelImportError(
      `Faltan columnas obligatorias: ${faltantes.map((c) => c.header).join(", ")}. Descarga la plantilla para usar los encabezados correctos.`
    );
  }

  const col = (key: string, row: ExcelJS.Row): ExcelJS.CellValue => {
    const index = columnIndexByKey.get(key);
    return index === undefined ? null : row.getCell(index).value;
  };

  const filasCrudas: { rowNumber: number; row: ExcelJS.Row }[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const valores = Array.isArray(row.values) ? row.values : [];
    const vacia = valores.every((v) => v === null || v === undefined || v === "");
    if (!vacia) filasCrudas.push({ rowNumber, row });
  });

  if (filasCrudas.length === 0) {
    throw new ExcelImportError("El archivo no tiene filas de datos.");
  }
  if (filasCrudas.length > MAX_EXCEL_ROWS) {
    throw new ExcelImportError(`El archivo tiene ${filasCrudas.length} filas — el máximo permitido por importación es ${MAX_EXCEL_ROWS}.`);
  }

  // Precarga de referencias: una consulta por tabla en vez de N+1 por fila.
  const codigosEnArchivo = filasCrudas
    .map(({ row }) => texto(col("codigoPatrimonial", row)))
    .filter((c): c is string => c !== null);

  const [tiposActivo, sedes, proveedores, existentes] = await Promise.all([
    prisma.tipoActivo.findMany(),
    prisma.sede.findMany({ include: { unidadesOperativas: true, ambientes: true } }),
    prisma.proveedor.findMany(),
    codigosEnArchivo.length > 0
      ? prisma.activo.findMany({ where: { codigoPatrimonial: { in: codigosEnArchivo } } })
      : Promise.resolve([]),
  ]);

  const tipoActivoPorNombre = new Map(tiposActivo.map((t) => [t.name.toLowerCase(), t]));
  const sedePorId = new Map(sedes.map((s) => [s.id, s]));
  const sedePorNombre = new Map(sedes.map((s) => [s.name.toLowerCase(), s]));
  const proveedorPorNombre = new Map(proveedores.map((p) => [p.razonSocial.toLowerCase(), p]));
  const activoPorCodigo = new Map(existentes.map((a) => [a.codigoPatrimonial, a]));

  const filas: ActivoImportRow[] = [];
  let crear = 0;
  let actualizar = 0;
  let conError = 0;

  for (const { rowNumber, row } of filasCrudas) {
    const errores: string[] = [];
    const codigoCelda = texto(col("codigoPatrimonial", row));

    const existente = codigoCelda ? activoPorCodigo.get(codigoCelda) : undefined;
    if (codigoCelda && !existente) {
      errores.push(
        `El código patrimonial "${codigoCelda}" no existe — deja la celda vacía para crear un activo nuevo, no inventes un código a mano.`
      );
    }
    const action: "crear" | "actualizar" = existente ? "actualizar" : "crear";
    const esActualizacion = action === "actualizar";

    const nombreCelda = texto(col("nombreActivo", row));
    const nombreActivo = nombreCelda ?? (esActualizacion ? existente!.nombreActivo : null);
    if (!nombreActivo) errores.push('"Nombre del activo" es obligatorio.');

    const tipoActivoTexto = texto(col("tipoActivo", row));
    let tipoActivoId: string | null = esActualizacion ? existente!.tipoActivoId : null;
    let tipoActivoCode: TipoActivoCode | null = esActualizacion
      ? (tiposActivo.find((t) => t.id === existente!.tipoActivoId)?.code ?? null)
      : null;
    if (tipoActivoTexto) {
      const tipo = tipoActivoPorNombre.get(tipoActivoTexto.toLowerCase());
      if (!tipo) errores.push(`"Tipo de activo" no reconocido: "${tipoActivoTexto}" — revisa la hoja "Valores válidos".`);
      else {
        tipoActivoId = tipo.id;
        tipoActivoCode = tipo.code;
      }
    } else if (!esActualizacion) {
      errores.push('"Tipo de activo" es obligatorio.');
    }

    const sedeTexto = texto(col("sede", row));
    let sedeId: string | null = esActualizacion ? existente!.sedeId : null;
    let sedeCambio = false;
    if (sedeTexto) {
      const sede = sedePorNombre.get(sedeTexto.toLowerCase());
      if (!sede) errores.push(`"Sede" no reconocida: "${sedeTexto}" — revisa la hoja "Valores válidos".`);
      else {
        sedeCambio = sede.id !== sedeId;
        sedeId = sede.id;
      }
    }
    const sedeActual = sedeId ? sedePorId.get(sedeId) : undefined;

    // Si la sede cambió, unidad/ambiente de la sede anterior ya no aplican
    // (violarían la relación unidad/ambiente -> sede) — se resetean salvo
    // que la propia fila indique una nueva unidad/ambiente explícitamente.
    const unidadTexto = texto(col("unidadOperativa", row));
    let unidadOperativaId: string | null = esActualizacion && !sedeCambio && !unidadTexto ? existente!.unidadOperativaId : null;
    if (unidadTexto) {
      if (!sedeActual) errores.push('"Unidad operativa" requiere que "Sede" también esté indicada y sea válida.');
      else {
        const unidad = sedeActual.unidadesOperativas.find((u) => u.name.toLowerCase() === unidadTexto.toLowerCase());
        if (!unidad) errores.push(`"Unidad operativa" no reconocida en la sede "${sedeActual.name}": "${unidadTexto}".`);
        else unidadOperativaId = unidad.id;
      }
    }

    const ambienteTexto = texto(col("ambiente", row));
    let ambienteId: string | null = esActualizacion && !sedeCambio && !ambienteTexto ? existente!.ambienteId : null;
    if (ambienteTexto) {
      if (!sedeActual) errores.push('"Ambiente" requiere que "Sede" también esté indicada y sea válida.');
      else {
        const ambiente = sedeActual.ambientes.find((a) => a.name.toLowerCase() === ambienteTexto.toLowerCase());
        if (!ambiente) errores.push(`"Ambiente" no reconocido en la sede "${sedeActual.name}": "${ambienteTexto}".`);
        else ambienteId = ambiente.id;
      }
    }

    const proveedorTexto = texto(col("proveedor", row));
    let proveedorId: string | null = esActualizacion ? existente!.proveedorId : null;
    if (proveedorTexto) {
      const proveedor = proveedorPorNombre.get(proveedorTexto.toLowerCase());
      if (!proveedor) errores.push(`"Proveedor" no reconocido: "${proveedorTexto}" — créalo primero desde una ficha de activo, o deja la celda vacía.`);
      else proveedorId = proveedor.id;
    }

    const fecha = fechaCelda(col("fechaAdquisicion", row));
    if (fecha === "invalida") errores.push('"Fecha de adquisición" no es una fecha válida.');
    const fechaAdquisicion = fecha === "invalida" ? null : (fecha ?? (esActualizacion ? existente!.fechaAdquisicion : null));

    const costo = numeroCelda(col("costoAdquisicion", row));
    if (Number.isNaN(costo)) errores.push('"Costo de adquisición" debe ser un número.');
    const valorContableCelda = numeroCelda(col("valorContable", row));
    if (Number.isNaN(valorContableCelda)) errores.push('"Valor contable" debe ser un número.');
    const valorActualCelda = numeroCelda(col("valorActual", row));
    if (Number.isNaN(valorActualCelda)) errores.push('"Valor actual" debe ser un número.');

    const estadoTexto = texto(col("estadoPatrimonial", row));
    let estadoPatrimonial: EstadoPatrimonial = esActualizacion ? existente!.estadoPatrimonial : "DISPONIBLE";
    if (estadoTexto) {
      const resuelto = porEtiqueta(ESTADO_PATRIMONIAL_OPTIONS, estadoTexto);
      if (!resuelto) errores.push(`"Estado patrimonial" no reconocido: "${estadoTexto}".`);
      else estadoPatrimonial = resuelto as EstadoPatrimonial;
    }

    const condicionTexto = texto(col("condicionFisica", row));
    let condicionFisica: CondicionFisica | null = esActualizacion ? existente!.condicionFisica : null;
    if (condicionTexto) {
      const resuelto = porEtiqueta(CONDICION_FISICA_OPTIONS, condicionTexto);
      if (!resuelto) errores.push(`"Condición física" no reconocida: "${condicionTexto}".`);
      else condicionFisica = resuelto as CondicionFisica;
    }

    if (errores.length > 0) {
      conError++;
      filas.push({ rowNumber, status: "error", nombreActivo: nombreActivo ?? "(sin nombre)", errores });
      continue;
    }

    if (esActualizacion) actualizar++;
    else crear++;

    const resumen: string[] = [];
    if (!esActualizacion) resumen.push("Se creará como activo nuevo.");
    else {
      if (nombreCelda && nombreCelda !== existente!.nombreActivo) resumen.push(`Nombre: "${existente!.nombreActivo}" → "${nombreCelda}"`);
      if (sedeCambio) resumen.push(`Sede: "${existente!.sedeId ? sedePorId.get(existente!.sedeId)?.name : "—"}" → "${sedeActual?.name}"`);
      if (estadoTexto && estadoPatrimonial !== existente!.estadoPatrimonial) {
        resumen.push(`Estado: ${existente!.estadoPatrimonial} → ${estadoPatrimonial}`);
      }
      if (resumen.length === 0) resumen.push("Sin cambios detectados en los campos base.");
    }

    const numeroFacturaCelda = texto(col("numeroFactura", row));
    const codigoProyectoCelda = texto(col("codigoProyecto", row));
    const descripcionCelda = texto(col("descripcion", row));
    const observacionesCelda = texto(col("observaciones", row));

    filas.push({
      rowNumber,
      status: "ok",
      action,
      nombreActivo: nombreActivo!,
      codigoPatrimonial: codigoCelda,
      resumen,
      data: {
        activoId: existente?.id ?? null,
        nombreActivo: nombreActivo!,
        tipoActivoId: tipoActivoId!,
        tipoActivoCode: tipoActivoCode!,
        sedeId,
        unidadOperativaId,
        ambienteId,
        proveedorId,
        fechaAdquisicion,
        numeroFactura: numeroFacturaCelda ?? (esActualizacion ? existente!.numeroFactura : null),
        codigoProyecto: codigoProyectoCelda ?? (esActualizacion ? existente!.codigoProyecto : null),
        costoAdquisicion: costo ?? (esActualizacion ? numeroDecimal(existente!.costoAdquisicion) : null),
        valorContable: valorContableCelda ?? (esActualizacion ? numeroDecimal(existente!.valorContable) : null),
        valorActual: valorActualCelda ?? (esActualizacion ? numeroDecimal(existente!.valorActual) : null),
        estadoPatrimonial,
        condicionFisica,
        descripcion: descripcionCelda ?? (esActualizacion ? existente!.descripcion : null),
        observaciones: observacionesCelda ?? (esActualizacion ? existente!.observaciones : null),
      },
    });
  }

  return { totalFilas: filasCrudas.length, crear, actualizar, conError, filas };
}

// Fase 40: aplica las filas ya validadas por parseActivosWorkbook (vista
// previa) — vuelve a filtrar por status "ok" como defensa en profundidad,
// no confía en que el caller ya haya descartado las filas con error. Mismo
// patrón crear/editar que activos/actions.ts: Movimiento(ALTA) en creación
// (ver Fase 39), Movimiento de edición cuando cambió ubicación/estado, y
// AuditoriaLog siempre.
export async function commitActivosImport(
  filas: ActivoImportRow[],
  usuarioId: string
): Promise<{ creados: number; actualizados: number }> {
  const validas = filas.filter((f): f is ActivoImportRowOk => f.status === "ok");

  return prisma.$transaction(async (tx) => {
    let creados = 0;
    let actualizados = 0;

    for (const fila of validas) {
      const { data } = fila;

      if (fila.action === "crear") {
        const codigoPatrimonial = await generarCodigoPatrimonial(tx, {
          tipoActivoCode: data.tipoActivoCode,
          nombreActivo: data.nombreActivo,
        });
        const created = await tx.activo.create({
          data: {
            codigoPatrimonial,
            nombreActivo: data.nombreActivo,
            nombreNormalizado: normalizeName(data.nombreActivo) ?? data.nombreActivo,
            tipoActivoId: data.tipoActivoId,
            sedeId: data.sedeId,
            unidadOperativaId: data.unidadOperativaId,
            ambienteId: data.ambienteId,
            proveedorId: data.proveedorId,
            fechaAdquisicion: data.fechaAdquisicion,
            numeroFactura: data.numeroFactura,
            codigoProyecto: data.codigoProyecto,
            costoAdquisicion: data.costoAdquisicion ?? undefined,
            valorContable: data.valorContable ?? undefined,
            valorActual: data.valorActual ?? undefined,
            estadoPatrimonial: data.estadoPatrimonial,
            condicionFisica: data.condicionFisica,
            descripcion: data.descripcion,
            observaciones: data.observaciones,
          },
        });
        await tx.movimiento.create({
          data: { activoId: created.id, usuarioId, ...buildMovimientoDeAlta(created, "Alta por importación de Excel") },
        });
        await registrarAuditoria(
          {
            accion: "DAR_DE_ALTA",
            entidad: "Activo",
            entidadId: created.id,
            detalle: { nombreActivo: created.nombreActivo, codigoPatrimonial: created.codigoPatrimonial, origen: "excel" },
            usuarioId,
          },
          tx
        );
        creados++;
      } else {
        const anterior = await tx.activo.findUniqueOrThrow({ where: { id: data.activoId! } });
        await tx.activo.update({
          where: { id: data.activoId! },
          data: {
            nombreActivo: data.nombreActivo,
            nombreNormalizado: normalizeName(data.nombreActivo) ?? data.nombreActivo,
            tipoActivoId: data.tipoActivoId,
            sedeId: data.sedeId,
            unidadOperativaId: data.unidadOperativaId,
            ambienteId: data.ambienteId,
            proveedorId: data.proveedorId,
            fechaAdquisicion: data.fechaAdquisicion,
            numeroFactura: data.numeroFactura,
            codigoProyecto: data.codigoProyecto,
            costoAdquisicion: data.costoAdquisicion ?? undefined,
            valorContable: data.valorContable ?? undefined,
            valorActual: data.valorActual ?? undefined,
            estadoPatrimonial: data.estadoPatrimonial,
            condicionFisica: data.condicionFisica,
            descripcion: data.descripcion,
            observaciones: data.observaciones,
          },
        });

        const movimiento = buildMovimientoDeEdicion(anterior, data);
        if (movimiento) {
          await tx.movimiento.create({ data: { activoId: data.activoId!, usuarioId, ...movimiento } });
        }
        await registrarAuditoria(
          {
            accion: movimientoTipoAAccionAuditoria(movimiento?.tipo ?? null),
            entidad: "Activo",
            entidadId: data.activoId!,
            detalle: { nombreActivo: data.nombreActivo, codigoPatrimonial: anterior.codigoPatrimonial, origen: "excel" },
            usuarioId,
          },
          tx
        );
        actualizados++;
      }
    }

    return { creados, actualizados };
  });
}
