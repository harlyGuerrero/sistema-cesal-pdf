"use client";

import { useEffect } from "react";
import { AlertTriangleIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fase 58: error al cargar el módulo (ej. la base no responde). En Next 16
// el boundary recibe `retry`, no `reset` (ver node_modules/next/dist/docs,
// file-conventions/error.md).
export default function DepreciacionError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="p-4 sm:p-6">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border p-8 text-center">
        <span
          className="flex size-10 items-center justify-center rounded-full"
          style={{ backgroundColor: "color-mix(in oklch, var(--color-critical) 15%, transparent)", color: "var(--color-critical)" }}
        >
          <AlertTriangleIcon className="size-5" />
        </span>
        <h1 className="text-base font-medium">No se pudo cargar la depreciación</h1>
        <p className="text-sm text-muted-foreground">Ocurrió un error al leer los datos. No se modificó ningún registro.</p>
        <Button variant="outline" onClick={() => retry()}>
          <RotateCwIcon />
          Reintentar
        </Button>
      </div>
    </main>
  );
}
