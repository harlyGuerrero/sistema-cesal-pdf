"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  abrirFichaEscaneada,
  esCodigoPatrimonial,
  normalizarCodigoEscaneado,
  urlDeCodigoEscaneado,
} from "@/lib/activos/codigo-escaneado";

// Un lector de mano teclea cada carácter con pocos milisegundos de diferencia;
// una persona tarda bastante más. Con más de este intervalo se descarta lo
// acumulado.
const MAX_MS_ENTRE_TECLAS = 80;

// Fase 67: escanear la etiqueta de un activo desde cualquier pantalla abre su
// ficha técnica en la pestaña de fichas (ver PESTANA_FICHA), sin perder la
// pantalla en la que se estaba. Solo escucha cuando el foco no está en un
// campo de texto (ahí el código se escribe en el campo, como espera quien
// está llenando un formulario) y solo actúa si lo tecleado tiene forma de
// código patrimonial y terminó en Enter.
export function EscanerGlobal() {
  const router = useRouter();

  useEffect(() => {
    let buffer = "";
    let ultimaTecla = 0;

    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;

      const ahora = performance.now();
      if (ahora - ultimaTecla > MAX_MS_ENTRE_TECLAS) buffer = "";
      ultimaTecla = ahora;

      if (event.key === "Enter") {
        const codigo = normalizarCodigoEscaneado(buffer);
        buffer = "";
        if (esCodigoPatrimonial(codigo)) {
          event.preventDefault();
          // Pestaña bloqueada por el navegador: se abre aquí mismo.
          if (!abrirFichaEscaneada(codigo)) router.push(urlDeCodigoEscaneado(codigo));
        }
        return;
      }
      if (event.key.length === 1) buffer += event.key;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
