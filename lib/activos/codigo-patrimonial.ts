import { randomUUID } from "node:crypto";
import type { Prisma, TipoActivoCode } from "@/lib/generated/prisma/client";

// Fase 16: código patrimonial auto-generado — PREFIJO-AB-AA-NNNN (ej.
// INF-LA-26-0001 para un "Laptop" de Equipos informáticos, 2026,
// correlativo 1). Se genera una sola vez al crear el Activo y queda fijo
// (nadie lo edita después, ver activo-form.tsx) porque termina impreso en
// una etiqueta física — cambiarlo rompería esa referencia.
export const PREFIJO_TIPO_ACTIVO: Record<TipoActivoCode, string> = {
  EQUIPOS_INFORMATICOS: "INF",
  EQUIPOS_DE_OFICINA: "OFF",
  MUEBLES_DE_OFICINA: "MOB",
  BIENES_VEHICULARES: "VEH",
  EQUIPOS_DE_MAQUINARIA: "MAQ",
  BIENES_INMUEBLES: "INM",
};

// Primeras 2 letras del nombre completo (decisión explícita del usuario:
// no iniciales palabra por palabra) — sin tildes/diacríticos, ignorando
// cualquier caracter que no sea letra (números, símbolos al inicio del
// nombre). "XX" de relleno si el nombre no trae ni 2 letras.
export function abreviarNombre(nombre: string): string {
  const soloLetras = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return (soloLetras.slice(0, 2) + "XX").slice(0, 2);
}

export function formatearCodigoPatrimonial(params: {
  tipoActivoCode: TipoActivoCode;
  nombreActivo: string;
  anio: number;
  correlativo: number;
}): string {
  const prefijo = PREFIJO_TIPO_ACTIVO[params.tipoActivoCode];
  const abreviatura = abreviarNombre(params.nombreActivo);
  const anioCorto = String(params.anio % 100).padStart(2, "0");
  const correlativo = String(params.correlativo).padStart(4, "0");
  return `${prefijo}-${abreviatura}-${anioCorto}-${correlativo}`;
}

// INSERT ... ON CONFLICT DO UPDATE en una sola sentencia: atómico incluso
// bajo creación concurrente (dos confirmaciones de importación a la vez, o
// una fila con quantity > 1 desdoblándose en varias unidades). Reserva
// "cantidad" números de un golpe en vez de una vuelta a la base por unidad,
// y devuelve el correlativo de la ÚLTIMA unidad reservada — el bloque
// propio de esta llamada es [devuelto - cantidad + 1, devuelto].
async function reservarCorrelativos(
  tx: Prisma.TransactionClient,
  tipoActivoCode: TipoActivoCode,
  anio: number,
  cantidad: number
): Promise<number> {
  const filas = await tx.$queryRaw<{ ultimo: number }[]>`
    INSERT INTO "codigo_patrimonial_contadores" ("id", "tipoActivoCode", "anio", "ultimo")
    VALUES (${randomUUID()}, ${tipoActivoCode}::"TipoActivoCode", ${anio}, ${cantidad})
    ON CONFLICT ("tipoActivoCode", "anio")
    DO UPDATE SET "ultimo" = "codigo_patrimonial_contadores"."ultimo" + ${cantidad}
    RETURNING "ultimo"
  `;
  return filas[0].ultimo;
}

export async function generarCodigosPatrimoniales(
  tx: Prisma.TransactionClient,
  params: { tipoActivoCode: TipoActivoCode; nombreActivo: string; cantidad: number; anio?: number }
): Promise<string[]> {
  if (params.cantidad <= 0) return [];

  const anio = params.anio ?? new Date().getFullYear();
  const ultimo = await reservarCorrelativos(tx, params.tipoActivoCode, anio, params.cantidad);
  const primero = ultimo - params.cantidad + 1;

  return Array.from({ length: params.cantidad }, (_, indice) =>
    formatearCodigoPatrimonial({
      tipoActivoCode: params.tipoActivoCode,
      nombreActivo: params.nombreActivo,
      anio,
      correlativo: primero + indice,
    })
  );
}

export async function generarCodigoPatrimonial(
  tx: Prisma.TransactionClient,
  params: { tipoActivoCode: TipoActivoCode; nombreActivo: string; anio?: number }
): Promise<string> {
  const [codigo] = await generarCodigosPatrimoniales(tx, { ...params, cantidad: 1 });
  return codigo;
}
