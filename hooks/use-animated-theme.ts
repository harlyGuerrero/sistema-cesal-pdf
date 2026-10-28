"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";

const DURACION_MS = 500;

// Cambio de tema con revelado circular desde el control que lo dispara
// (View Transitions API). Sin soporte del navegador o con "reducir
// movimiento" activo, cambia el tema al instante como antes.
export function useAnimatedThemeChange() {
  const { setTheme } = useTheme();

  return React.useCallback(
    (theme: "light" | "dark", origin?: HTMLElement | null) => {
      const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (typeof document.startViewTransition !== "function" || reducirMovimiento) {
        setTheme(theme);
        return;
      }

      const rect = origin?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

      const transition = document.startViewTransition(() => {
        // next-themes aplica la clase en un efecto; se aplica acá también
        // para que la captura "nueva" ya tenga el tema final.
        const root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        root.classList.toggle("light", theme === "light");
        root.style.colorScheme = theme;
        flushSync(() => setTheme(theme));
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`],
            },
            {
              duration: DURACION_MS,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {});
    },
    [setTheme]
  );
}
