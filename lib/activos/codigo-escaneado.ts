import { registrarEscaneo } from "./registro-escaneos";

// Fase 67: lo que llega al escanear la etiqueta de un activo. Un lector de
// código de barras USB/Bluetooth "teclea" el código como si fuera un teclado,
// y si el lector está configurado en distribución US mientras Windows usa la
// española/latinoamericana, el guion sale como otro carácter (' o ? o _).
// Por eso se normaliza: mayúsculas y cualquier separador → "-".
// Sin dependencias de servidor: lo usan también componentes de cliente.

export function normalizarCodigoEscaneado(texto: string): string {
  return texto
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Formato de lib/activos/codigo-patrimonial.ts: PREFIJO-AB-AA-NNNN
// (ej. INF-LA-26-0001). El correlativo puede pasar de 4 dígitos.
const CODIGO_PATRIMONIAL = /^[A-Z]{3}-[A-Z]{2}-\d{2}-\d{4,}$/;

export function esCodigoPatrimonial(codigo: string): boolean {
  return CODIGO_PATRIMONIAL.test(codigo);
}

export function urlDeCodigoEscaneado(codigo: string): string {
  return `/activos/codigo/${encodeURIComponent(codigo)}`;
}

// La ficha escaneada se abre siempre en la MISMA pestaña con nombre: el
// primer escaneo la crea y los siguientes la reutilizan, en vez de abrir una
// pestaña nueva por cada bien inventariado. Si se sigue escaneando con esa
// pestaña al frente, EscanerGlobal la navega a la ficha siguiente.
export const PESTANA_FICHA = "cesal-ficha-activo";

// Registra el escaneo y abre la ficha. Debe llamarse dentro de un evento del
// usuario (tecla, clic): fuera de eso el navegador bloquea la pestaña y
// devuelve false, para que quien llama ofrezca un enlace.
export function abrirFichaEscaneada(codigo: string): boolean {
  registrarEscaneo(codigo);
  return window.open(urlDeCodigoEscaneado(codigo), PESTANA_FICHA) !== null;
}
