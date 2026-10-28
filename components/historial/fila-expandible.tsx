"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Fase 59: fila de un historial (Movimientos, historial del activo,
// Auditoría) que se abre para mostrar el detalle. Las celdas y el detalle
// llegan ya armados desde el servidor; esto solo guarda si está abierta.
// En pantallas angostas la fila deja de ser tabla y se apila (ver las
// clases max-md de las celdas en cada tabla).
export function FilaExpandible({
  celdas,
  detalle,
  columnas,
  etiqueta,
}: {
  celdas: React.ReactNode;
  detalle: React.ReactNode;
  columnas: number;
  etiqueta: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const detalleId = useId();

  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer align-top max-md:grid max-md:grid-cols-[1fr_auto] max-md:gap-x-3 max-md:gap-y-1.5 max-md:px-4 max-md:py-3",
          abierta && "border-b-0 bg-muted/40"
        )}
        onClick={(event) => {
          // Un enlace dentro de la fila (ej. el nombre del activo) navega; no abre.
          if ((event.target as HTMLElement).closest("a")) return;
          setAbierta((valor) => !valor);
        }}
      >
        {celdas}
        <TableCell className="w-10 pr-4 text-right max-md:col-start-2 max-md:row-start-1 max-md:p-0">
          <button
            type="button"
            aria-expanded={abierta}
            aria-controls={detalleId}
            aria-label={`${abierta ? "Ocultar" : "Ver"} detalles: ${etiqueta}`}
            onClick={(event) => {
              event.stopPropagation();
              setAbierta((valor) => !valor);
            }}
            className="inline-flex size-7 items-center justify-center rounded-md text-primary outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronDownIcon className={cn("size-4 transition-transform duration-200", abierta && "rotate-180")} />
          </button>
        </TableCell>
      </TableRow>
      {abierta && (
        <TableRow id={detalleId} className="bg-muted/40 hover:bg-muted/40 max-md:block">
          <TableCell colSpan={columnas} className="px-4 pt-1 pb-5 whitespace-normal md:pl-14 max-md:block">
            {/* Único movimiento del historial: el detalle se despliega corto,
                desde ya visible, y sin animación con reduced-motion. */}
            <div className="animate-in duration-200 ease-out fade-in-0 slide-in-from-top-1 motion-reduce:animate-none">
              {detalle}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
