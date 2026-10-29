import { toSVG } from "bwip-js/node";

// Fase 67: código de barras de la etiqueta de un activo. Code 128 con el
// código patrimonial tal cual (no una URL): es lo que leen los lectores de
// mano y queda corto aunque la etiqueta sea pequeña. Al escanearlo dentro
// del sistema, EscanerGlobal o /activos/escanear abren la ficha (ver
// lib/activos/codigo-escaneado.ts). El texto legible se dibuja aparte en
// HTML para controlar su tipografía, por eso includetext va apagado.
export function codigoBarrasSvg(codigoPatrimonial: string): string {
  return toSVG({
    bcid: "code128",
    text: codigoPatrimonial,
    scale: 2,
    height: 10,
    paddingwidth: 0,
    paddingheight: 0,
    includetext: false,
  });
}
