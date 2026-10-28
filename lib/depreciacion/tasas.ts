import type { TipoActivoCode } from "../generated/prisma/client";

// Fase 58: tasas anuales de depreciación oficiales de CESAL, en porcentaje.
// La fuente de verdad en tiempo de ejecución es la tabla tasas_depreciacion
// (TasaDepreciacion): esta constante solo la siembra — la usa prisma/seed.ts
// en una base nueva, y la migración fase58_depreciacion inserta los mismos
// valores en una base existente. Cambiar una tasa en producción se hace en
// la tabla, no acá.
export const TASAS_OFICIALES_CESAL: Record<TipoActivoCode, string> = {
  EDIFICACIONES: "5",
  VEHICULOS_Y_MEDIOS_DE_TRANSPORTE: "10",
  EQUIPOS_INFORMATICOS: "25",
  EQUIPOS_DE_OFICINA: "10",
  ACTIVOS_INTANGIBLES_INFORMATICOS: "25",
  MAQUINARIA_Y_EQUIPOS: "10",
  MOBILIARIO_Y_ENSERES: "10",
};

// Las tasas se manejan como enteros en "diezmilésimas de punto porcentual"
// (6,25 % -> 62_500) para no operar con coma flotante: Decimal(7,4) de la
// base cabe exacto en esta escala.
export const ESCALA_TASA = 10_000;

// Convierte "6.25" / "6.2500" / Decimal (vía toString) a la escala entera.
// Devuelve null si no es un porcentaje válido en (0, 100].
export function parseTasa(value: { toString(): string } | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const raw = value.toString().trim();
  const match = /^(\d{1,3})(?:\.(\d{1,4}))?$/.exec(raw);
  if (!match) return null;
  const entero = Number(match[1]);
  const decimales = Number((match[2] ?? "").padEnd(4, "0"));
  const escalada = entero * ESCALA_TASA + decimales;
  if (escalada <= 0 || escalada > 100 * ESCALA_TASA) return null;
  return escalada;
}

// Única derivación de la tasa trimestral a partir de la anual. Se exige que
// sea exacta en 4 decimales (anual múltiplo de 0,0004 %), cierto para las 7
// tasas oficiales; una tasa que no divida exacto se rechaza en vez de
// redondearse en silencio.
export function tasaTrimestralDesdeAnual(tasaAnualEscalada: number): number | null {
  if (tasaAnualEscalada % 4 !== 0) return null;
  return tasaAnualEscalada / 4;
}

// "6.25" para mostrar o guardar como Decimal(7,4).
export function tasaATexto(tasaEscalada: number): string {
  const entero = Math.floor(tasaEscalada / ESCALA_TASA);
  const decimales = String(tasaEscalada % ESCALA_TASA).padStart(4, "0");
  return `${entero}.${decimales}`;
}

// "6,25 %" (formato peruano pedido para el módulo: coma decimal).
export function formatTasa(tasaEscalada: number | null): string {
  if (tasaEscalada === null) return "—";
  const [entero, decimales] = tasaATexto(tasaEscalada).split(".");
  const recortados = decimales.replace(/0+$/, "").padEnd(2, "0");
  return `${entero},${recortados} %`;
}
