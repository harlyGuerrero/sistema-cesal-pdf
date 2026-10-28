import type { EstadoPatrimonial } from "../generated/prisma/client";
import { ESCALA_TASA, parseTasa, tasaTrimestralDesdeAnual } from "./tasas";

// Fase 58: motor de depreciación lineal trimestral de CESAL. Puro (sin
// Prisma ni Next) para poder probarlo con Vitest y para que el módulo
// general, el detalle del activo y el procesamiento usen exactamente la
// misma cuenta.
//
// Reglas (ver CLAUDE.md / pedido de Fase 58):
// - Base: costo original de adquisición. Valor residual S/ 0,00.
// - Empieza en el trimestre calendario de la fecha de adquisición, con la
//   tasa trimestral completa sin importar el día de compra.
// - Cada trimestre deprecia costo × tasa trimestral (sobre el costo, no
//   sobre el saldo), salvo el último, que deprecia solo el saldo pendiente.
// - El acumulado nunca supera el costo y el valor neto nunca es negativo.
//
// Montos en centavos enteros (number: Decimal(14,2) cabe holgado bajo
// 2^53) y la multiplicación por la tasa en BigInt. Política de redondeo:
// half-up a centavos, una sola vez por periodo; como el último periodo
// toma el saldo exacto, el acumulado termina en el costo al centavo.

export type Trimestre = 1 | 2 | 3 | 4;

export interface Periodo {
  anio: number;
  trimestre: Trimestre;
}

export type EstadoDepreciacion =
  | "PENDIENTE_REVISION"
  | "CONFIGURACION_PENDIENTE"
  | "PENDIENTE_DEPRECIACION"
  | "EN_DEPRECIACION"
  | "TOTALMENTE_DEPRECIADO";

export type CodigoProblema =
  | "SIN_COSTO"
  | "SIN_FECHA"
  | "FECHA_FUTURA"
  | "SIN_TASA"
  | "TASA_INVALIDA"
  | "HISTORIAL_INCONSISTENTE";

export interface Problema {
  codigo: CodigoProblema;
  mensaje: string;
}

// Lo que el motor necesita saber de un Activo. Los Decimal de Prisma entran
// como string (toString()) para no pasar nunca por coma flotante.
export interface ActivoDepreciable {
  costoAdquisicion: string | null;
  fechaAdquisicion: Date | null;
  estadoPatrimonial: EstadoPatrimonial;
  // null = el tipo de activo no tiene TasaDepreciacion activa.
  tasaAnual: string | null;
}

// Un DepreciacionPeriodo ya registrado, en la misma forma de centavos/escala.
export interface RegistroDepreciacion extends Periodo {
  costoBaseCentavos: number;
  tasaTrimestral: number;
  importeCentavos: number;
  acumuladoCentavos: number;
  valorNetoCentavos: number;
}

export type PeriodoCalculado = RegistroDepreciacion;

// ---------------------------------------------------------------------------
// Periodos
// ---------------------------------------------------------------------------

export function periodoIndex(periodo: Periodo): number {
  return periodo.anio * 4 + (periodo.trimestre - 1);
}

export function periodoDesdeIndex(index: number): Periodo {
  return { anio: Math.floor(index / 4), trimestre: ((index % 4) + 1) as Trimestre };
}

export function compararPeriodos(a: Periodo, b: Periodo): number {
  return periodoIndex(a) - periodoIndex(b);
}

// Las fechas de adquisición se guardan como fecha sin hora (medianoche UTC,
// ver activos/actions.ts: new Date("2026-05-20")), así que el mes se lee en
// UTC — leerlo en hora local movería el 1 de abril al 31 de marzo en Lima.
export function trimestreDeFecha(fecha: Date): Periodo {
  return { anio: fecha.getUTCFullYear(), trimestre: (Math.floor(fecha.getUTCMonth() / 3) + 1) as Trimestre };
}

// Trimestre en curso según la hora de Lima (UTC-5 todo el año, sin horario
// de verano) — decide hasta qué trimestre se permite procesar.
export function periodoActual(ahora: Date = new Date()): Periodo {
  return trimestreDeFecha(new Date(ahora.getTime() - 5 * 60 * 60 * 1000));
}

// Último día del trimestre, como fecha UTC sin hora.
export function finDePeriodo(periodo: Periodo): Date {
  return new Date(Date.UTC(periodo.anio, periodo.trimestre * 3, 0));
}

export function formatPeriodo(periodo: { anio: number; trimestre: number }): string {
  return `${periodo.trimestre}T ${periodo.anio}`;
}

// ---------------------------------------------------------------------------
// Montos
// ---------------------------------------------------------------------------

// "4000", "4000.5", "4000.00" (Decimal.toString()) -> 400000. null si no es
// un monto válido con hasta 2 decimales.
export function parseCentavos(value: { toString(): string } | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.toString().trim());
  if (!match) return null;
  const centavos = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0"));
  return match[1] === "-" ? -centavos : centavos;
}

export function centavosATexto(centavos: number): string {
  const signo = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  return `${signo}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

// "S/ 4.000,00" — formato pedido para el módulo (punto de miles, coma
// decimal). Se arma a mano desde centavos para no depender del ICU del
// runtime ni pasar por coma flotante.
export function formatSoles(centavos: number | null): string {
  if (centavos === null) return "—";
  const signo = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  const entero = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${signo}S/ ${entero},${String(abs % 100).padStart(2, "0")}`;
}

// "25,00 %".
export function formatPorcentaje(valor: number, decimales: number = 2): string {
  return `${valor.toFixed(decimales).replace(".", ",")} %`;
}

// "20/05/2026" para fechas sin hora (fecha de adquisición, en UTC — ver
// trimestreDeFecha).
export function formatFecha(fecha: Date | null): string {
  if (!fecha) return "—";
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${fecha.getUTCFullYear()}`;
}

// costo × tasa trimestral, redondeado half-up a centavos.
export function depreciacionTrimestralTeorica(costoCentavos: number, tasaTrimestral: number): number {
  const divisor = BigInt(100 * ESCALA_TASA);
  const producto = BigInt(costoCentavos) * BigInt(tasaTrimestral);
  const dos = BigInt(2);
  return Number((producto * dos + divisor) / (divisor * dos));
}

// ---------------------------------------------------------------------------
// Historial agregado
// ---------------------------------------------------------------------------

// Lo que el motor necesita saber del historial registrado de un activo. El
// listado general lo obtiene con un GROUP BY en SQL (ver consultas.ts) y el
// detalle lo arma desde las filas con agregarHistorial — mismo resumen y
// misma validación en los dos lados, así el valor neto del listado y el del
// detalle no pueden diferir.
export interface HistorialAgregado {
  cantidad: number;
  sumaImportesCentavos: number;
  primerIndex: number | null;
  ultimoIndex: number | null;
  ultimoAcumuladoCentavos: number | null;
  ultimoValorNetoCentavos: number | null;
  costoBaseMinCentavos: number | null;
  costoBaseMaxCentavos: number | null;
}

export const HISTORIAL_VACIO: HistorialAgregado = {
  cantidad: 0,
  sumaImportesCentavos: 0,
  primerIndex: null,
  ultimoIndex: null,
  ultimoAcumuladoCentavos: null,
  ultimoValorNetoCentavos: null,
  costoBaseMinCentavos: null,
  costoBaseMaxCentavos: null,
};

// Con `corte`, solo cuenta los periodos hasta ese trimestre inclusive.
export function agregarHistorial(registros: RegistroDepreciacion[], corte?: Periodo): HistorialAgregado {
  const vigentes = (corte ? registros.filter((r) => compararPeriodos(r, corte) <= 0) : [...registros]).sort(
    compararPeriodos
  );
  if (vigentes.length === 0) return HISTORIAL_VACIO;
  const ultimo = vigentes.at(-1)!;
  const costos = vigentes.map((r) => r.costoBaseCentavos);
  return {
    cantidad: vigentes.length,
    sumaImportesCentavos: vigentes.reduce((total, r) => total + r.importeCentavos, 0),
    primerIndex: periodoIndex(vigentes[0]),
    ultimoIndex: periodoIndex(ultimo),
    ultimoAcumuladoCentavos: ultimo.acumuladoCentavos,
    ultimoValorNetoCentavos: ultimo.valorNetoCentavos,
    costoBaseMinCentavos: Math.min(...costos),
    costoBaseMaxCentavos: Math.max(...costos),
  };
}

// El historial tiene que poder reconstruirse: periodos consecutivos (la
// unique impide repetidos, así que basta comparar cantidad con el rango)
// desde el trimestre de adquisición, todos sobre el costo actual, y el
// último acumulado igual a la suma de los importes. Cada fila además cumple
// valorNeto = costoBase - acumulado por CHECK en la base. Si algo no cierra
// (ej. alguien cambió costo o fecha por fuera de la aplicación), el activo
// no se sigue depreciando hasta que lo revise una persona.
export function verificarHistorial(
  historial: HistorialAgregado,
  costoCentavos: number,
  primerPeriodo: Periodo
): string | null {
  if (historial.cantidad === 0) return null;
  if (
    historial.primerIndex !== periodoIndex(primerPeriodo) ||
    historial.ultimoIndex! - historial.primerIndex + 1 !== historial.cantidad
  ) {
    return `Los periodos registrados no son consecutivos desde ${formatPeriodo(primerPeriodo)} (trimestre de adquisición).`;
  }
  if (historial.costoBaseMinCentavos !== costoCentavos || historial.costoBaseMaxCentavos !== costoCentavos) {
    return "El costo de adquisición no coincide con el costo usado en la depreciación registrada.";
  }
  if (
    historial.ultimoAcumuladoCentavos !== historial.sumaImportesCentavos ||
    historial.sumaImportesCentavos > costoCentavos
  ) {
    return "La depreciación acumulada registrada no coincide con la suma de los periodos.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validación de un activo
// ---------------------------------------------------------------------------

interface DatosValidos {
  costoCentavos: number;
  primerPeriodo: Periodo;
  tasaAnual: number;
  tasaTrimestral: number;
}

export interface Validacion {
  datos: DatosValidos | null;
  // Datos del activo que alguien tiene que corregir (costo, fecha, historial).
  problemasDatos: Problema[];
  // Falta o está mal la tasa de su tipo de activo.
  problemasConfiguracion: Problema[];
}

export function validarActivo(
  activo: ActivoDepreciable,
  historial: HistorialAgregado,
  ahora: Date = new Date()
): Validacion {
  const problemasDatos: Problema[] = [];
  const problemasConfiguracion: Problema[] = [];

  const costoCentavos = parseCentavos(activo.costoAdquisicion);
  const costoValido = costoCentavos !== null && costoCentavos > 0;
  if (!costoValido) {
    problemasDatos.push({ codigo: "SIN_COSTO", mensaje: "Sin costo de adquisición válido (mayor a S/ 0,00)." });
  }

  let primerPeriodo: Periodo | null = null;
  if (!activo.fechaAdquisicion) {
    problemasDatos.push({ codigo: "SIN_FECHA", mensaje: "Sin fecha de adquisición." });
  } else if (compararPeriodos(trimestreDeFecha(activo.fechaAdquisicion), periodoActual(ahora)) > 0) {
    problemasDatos.push({ codigo: "FECHA_FUTURA", mensaje: "La fecha de adquisición es posterior al trimestre en curso." });
  } else {
    primerPeriodo = trimestreDeFecha(activo.fechaAdquisicion);
  }

  let tasaAnual: number | null = null;
  let tasaTrimestral: number | null = null;
  if (activo.tasaAnual === null) {
    problemasConfiguracion.push({ codigo: "SIN_TASA", mensaje: "Su tipo de activo no tiene tasa de depreciación configurada." });
  } else {
    tasaAnual = parseTasa(activo.tasaAnual);
    tasaTrimestral = tasaAnual === null ? null : tasaTrimestralDesdeAnual(tasaAnual);
    if (tasaTrimestral === null) {
      problemasConfiguracion.push({ codigo: "TASA_INVALIDA", mensaje: "La tasa configurada para su tipo de activo no es válida." });
    }
  }

  if (costoValido && primerPeriodo) {
    const inconsistencia = verificarHistorial(historial, costoCentavos, primerPeriodo);
    if (inconsistencia) problemasDatos.push({ codigo: "HISTORIAL_INCONSISTENTE", mensaje: inconsistencia });
  }

  const datos =
    problemasDatos.length === 0 && problemasConfiguracion.length === 0
      ? { costoCentavos: costoCentavos!, primerPeriodo: primerPeriodo!, tasaAnual: tasaAnual!, tasaTrimestral: tasaTrimestral! }
      : null;

  return { datos, problemasDatos, problemasConfiguracion };
}

// ---------------------------------------------------------------------------
// Resumen (módulo general y detalle del activo)
// ---------------------------------------------------------------------------

export interface ResumenDepreciacion {
  estado: EstadoDepreciacion;
  problemas: Problema[];
  costoCentavos: number | null;
  tasaAnual: number | null;
  tasaTrimestral: number | null;
  acumuladoCentavos: number;
  valorNetoCentavos: number | null;
  // 0..100, con 2 decimales.
  porcentajeDepreciado: number;
  cantidadPeriodos: number;
  ultimoPeriodo: Periodo | null;
}

// Situación de un activo según su historial (ya recortado al corte pedido,
// si lo hay). El acumulado sale de la suma de lo registrado, nunca de un
// valor guardado aparte.
export function resumirDepreciacion(
  activo: ActivoDepreciable,
  historial: HistorialAgregado,
  ahora: Date = new Date()
): ResumenDepreciacion {
  const validacion = validarActivo(activo, historial, ahora);

  const costoParsed = parseCentavos(activo.costoAdquisicion);
  const costoCentavos = costoParsed !== null && costoParsed > 0 ? costoParsed : null;
  const tasaAnual = activo.tasaAnual === null ? null : parseTasa(activo.tasaAnual);
  const tasaTrimestral = tasaAnual === null ? null : tasaTrimestralDesdeAnual(tasaAnual);

  const suma = historial.sumaImportesCentavos;
  const acumuladoCentavos = costoCentavos === null ? suma : Math.min(costoCentavos, suma);
  const valorNetoCentavos = costoCentavos === null ? null : Math.max(0, costoCentavos - acumuladoCentavos);
  const porcentajeDepreciado =
    costoCentavos === null
      ? 0
      : Math.min(100, Math.max(0, Math.round((acumuladoCentavos * 10_000) / costoCentavos) / 100));

  let estado: EstadoDepreciacion;
  if (validacion.problemasDatos.length > 0) estado = "PENDIENTE_REVISION";
  else if (costoCentavos !== null && historial.cantidad > 0 && acumuladoCentavos >= costoCentavos)
    estado = "TOTALMENTE_DEPRECIADO";
  else if (validacion.problemasConfiguracion.length > 0) estado = "CONFIGURACION_PENDIENTE";
  else if (historial.cantidad === 0) estado = "PENDIENTE_DEPRECIACION";
  else estado = "EN_DEPRECIACION";

  return {
    estado,
    problemas: [...validacion.problemasDatos, ...validacion.problemasConfiguracion],
    costoCentavos,
    tasaAnual,
    tasaTrimestral,
    acumuladoCentavos,
    valorNetoCentavos,
    porcentajeDepreciado,
    cantidadPeriodos: historial.cantidad,
    ultimoPeriodo: historial.ultimoIndex === null ? null : periodoDesdeIndex(historial.ultimoIndex),
  };
}

// Fase 60: valor contable y valor actual de un Activo. Para CESAL los dos
// son el valor neto contable (costo menos la depreciación registrada) cuando
// la depreciación del activo está definida — costo, fecha y una tasa válidos
// y un historial que cuadra. Si no lo está (pendiente de revisión o de
// configuración), devuelve null: los campos siguen siendo manuales. Lo usan
// el formulario (en vivo) y el servidor (al guardar), así que no pueden
// diferir.
export function valorContableCalculado(resumen: ResumenDepreciacion): number | null {
  if (resumen.estado === "PENDIENTE_REVISION" || resumen.estado === "CONFIGURACION_PENDIENTE") return null;
  return resumen.valorNetoCentavos;
}

// ---------------------------------------------------------------------------
// Planificación de un procesamiento
// ---------------------------------------------------------------------------

export type MotivoOmision = "TOTALMENTE_DEPRECIADO" | "ADQUIRIDO_DESPUES" | "DADO_DE_BAJA";

export type PlanActivo =
  | { tipo: "error"; problemas: Problema[] }
  | { tipo: "omitido"; motivo: MotivoOmision }
  | { tipo: "al_dia" }
  | { tipo: "pendiente"; periodos: PeriodoCalculado[] };

// Qué periodos hay que registrar para dejar al activo depreciado hasta
// `objetivo` inclusive. `historial` es el historial completo (sin corte).
// Si le faltan trimestres anteriores (activo cargado tarde, o primer
// procesamiento del sistema), los genera todos en orden desde el siguiente
// al último registrado — así el acumulado siempre es la suma de un historial
// completo y verificable. Nunca devuelve un periodo ya registrado: eso, más
// la unique (activoId, anio, trimestre), hace que procesar dos veces el
// mismo trimestre no duplique nada.
export function planificarDepreciacion(
  activo: ActivoDepreciable,
  historial: HistorialAgregado,
  objetivo: Periodo,
  ahora: Date = new Date()
): PlanActivo {
  const validacion = validarActivo(activo, historial, ahora);

  // Ya totalmente depreciado: no le toca nada más aunque después le hayan
  // quitado la tasa a su tipo; un problema en sus datos sí se reporta.
  if (historial.ultimoValorNetoCentavos === 0 && validacion.problemasDatos.length === 0) {
    return { tipo: "omitido", motivo: "TOTALMENTE_DEPRECIADO" };
  }
  // Decisión de Fase 58: un activo dado de baja deja de depreciarse; su
  // historial queda como está.
  if (activo.estadoPatrimonial === "BAJA") {
    return { tipo: "omitido", motivo: "DADO_DE_BAJA" };
  }
  if (!validacion.datos) {
    return { tipo: "error", problemas: [...validacion.problemasDatos, ...validacion.problemasConfiguracion] };
  }

  const { costoCentavos, primerPeriodo, tasaTrimestral } = validacion.datos;
  if (compararPeriodos(primerPeriodo, objetivo) > 0) {
    return { tipo: "omitido", motivo: "ADQUIRIDO_DESPUES" };
  }

  // Un costo de pocos centavos puede redondear la cuota a S/ 0,00; se toma
  // 1 céntimo como mínimo para que el activo igual llegue a cero.
  const teorica = Math.max(1, depreciacionTrimestralTeorica(costoCentavos, tasaTrimestral));
  let acumulado = historial.ultimoAcumuladoCentavos ?? 0;
  let index = historial.ultimoIndex !== null ? historial.ultimoIndex + 1 : periodoIndex(primerPeriodo);
  const periodos: PeriodoCalculado[] = [];

  while (index <= periodoIndex(objetivo) && acumulado < costoCentavos) {
    const importe = Math.min(teorica, costoCentavos - acumulado);
    acumulado += importe;
    periodos.push({
      ...periodoDesdeIndex(index),
      costoBaseCentavos: costoCentavos,
      tasaTrimestral,
      importeCentavos: importe,
      acumuladoCentavos: acumulado,
      valorNetoCentavos: costoCentavos - acumulado,
    });
    index++;
  }

  return periodos.length === 0 ? { tipo: "al_dia" } : { tipo: "pendiente", periodos };
}

