"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

// Fase 59: al elegir una cifra de la matriz, el desglose queda debajo del
// borde de la pantalla y el cambio no se ve. Esto lleva la vista hasta el
// desglose cada vez que cambia la celda elegida (no con los demás filtros).
// No se usa un "#desglose" en el enlace: en Next 16 un Link a la misma ruta
// con ancla no navegaba.
export function DesgloseAncla() {
  const searchParams = useSearchParams();
  const celda = `${searchParams.get("fila") ?? ""}|${searchParams.get("col") ?? ""}`;
  const anclaRef = useRef<HTMLSpanElement>(null);
  const previa = useRef(celda);

  useEffect(() => {
    const cambio = previa.current !== celda;
    previa.current = celda;
    if (!cambio || celda === "|") return;
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anclaRef.current?.scrollIntoView({ behavior: reducirMovimiento ? "auto" : "smooth", block: "start" });
  }, [celda]);

  return <span ref={anclaRef} aria-hidden className="block scroll-mt-6" />;
}
