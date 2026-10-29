"use client";

import { useMemo, useState } from "react";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EtiquetaActivo, type EtiquetaActivoDatos, type FormatoEtiqueta } from "@/components/etiqueta-activo";
import { cn } from "@/lib/utils";

export interface EtiquetaLoteItem extends EtiquetaActivoDatos {
  id: string;
}

// Hoja A4 de 70 × 37 mm: 3 columnas × 8 filas = 210 × 296 mm, la hoja entera.
const COLUMNAS = 3;
const FILAS = 8;
const POR_HOJA = COLUMNAS * FILAS;

const FORMATOS: { value: FormatoEtiqueta; titulo: string; detalle: string }[] = [
  { value: "a4", titulo: "Hoja A4", detalle: "24 etiquetas de 70 × 37 mm por hoja" },
  { value: "rollo", titulo: "Rollo de etiquetas", detalle: "Una etiqueta de 60 × 35 mm por página" },
];

function enHojas<T>(items: T[], porHoja: number): T[][] {
  const hojas: T[][] = [];
  for (let i = 0; i < items.length; i += porHoja) hojas.push(items.slice(i, i + porHoja));
  return hojas;
}

// Guías de recorte: solo las líneas entre etiquetas, y cada una la dibuja una
// sola de las dos vecinas (borde derecho e inferior), así no se duplican. Los
// cuatro bordes de la hoja son el borde del papel y no llevan línea. Son
// bordes de la etiqueta y no una capa encima: con una capa superpuesta Chrome
// imprimía las etiquetas en blanco. Mismas clases en pantalla y al imprimir,
// para que la vista previa sea la hoja tal cual sale.
function clasesGuia(indice: number): string {
  return cn(
    "border-dashed border-gray-400",
    indice % COLUMNAS !== COLUMNAS - 1 && "border-r",
    Math.floor(indice / COLUMNAS) !== FILAS - 1 && "border-b"
  );
}

// Fase 67: impresión de etiquetas — en lote desde /activos/etiquetas o de un
// solo activo desde su página. Al imprimir solo sale el área de etiquetas
// (lo demás lleva print:hidden y el layout ya oculta sidebar y header), y
// @page fija el papel según el formato para que la impresora no escale.
export function EtiquetasImpresion({
  activos,
  seleccionable = true,
}: {
  activos: EtiquetaLoteItem[];
  seleccionable?: boolean;
}) {
  const [formato, setFormato] = useState<FormatoEtiqueta>("a4");
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(activos.map((activo) => activo.id)));
  // Solo en hojas adhesivas (sin guías) ya usadas en parte: posición (1-24)
  // de la primera etiqueta libre. En papel común siempre se empieza en la 1.
  const [inicio, setInicio] = useState(1);
  // Guías de recorte para papel común que se corta a mano (ver clasesGuia);
  // en hojas adhesivas precortadas se desactivan.
  const [guias, setGuias] = useState(true);

  // Si cambian los filtros, la página manda otra lista: se seleccionan todos
  // los nuevos (mismo patrón de "estado derivado de props" que ActivosFilters).
  const [listaPrevia, setListaPrevia] = useState(activos);
  if (listaPrevia !== activos) {
    setListaPrevia(activos);
    setSeleccion(new Set(activos.map((activo) => activo.id)));
  }

  const elegidos = useMemo(() => activos.filter((activo) => seleccion.has(activo.id)), [activos, seleccion]);
  const celdas: (EtiquetaLoteItem | null)[] =
    formato === "a4" && !guias ? [...Array(inicio - 1).fill(null), ...elegidos] : elegidos;
  const hojas = formato === "a4" ? enHojas(celdas, POR_HOJA) : [];

  function alternar(id: string) {
    setSeleccion((previa) => {
      const nueva = new Set(previa);
      if (nueva.has(id)) nueva.delete(id);
      else nueva.add(id);
      return nueva;
    });
  }

  return (
    <div className="space-y-6">
      <style>{formato === "a4" ? "@page { size: A4; margin: 0; }" : "@page { size: 60mm 35mm; margin: 0; }"}</style>

      <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-6 print:hidden">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Formato de impresión">
          {FORMATOS.map((opcion) => (
            <button
              key={opcion.value}
              type="button"
              role="radio"
              aria-checked={formato === opcion.value}
              onClick={() => setFormato(opcion.value)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                formato === opcion.value ? "border-primary bg-primary/5" : "hover:bg-muted/60"
              )}
            >
              <span className="block text-sm font-medium">{opcion.titulo}</span>
              <span className="block text-xs text-muted-foreground">{opcion.detalle}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          {formato === "a4" && !guias ? (
            <div className="space-y-1">
              <Label htmlFor="inicio-hoja">Empezar en la etiqueta</Label>
              <Select value={String(inicio)} onValueChange={(value) => setInicio(Number(value) || 1)}>
                <SelectTrigger id="inicio-hoja" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: POR_HOJA }, (_, i) => i + 1).map((posicion) => (
                    <SelectItem key={posicion} value={String(posicion)}>
                      {posicion === 1 ? "1 (hoja nueva)" : `${posicion} (fila ${Math.ceil(posicion / 3)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground tabular-nums">
              {elegidos.length} {elegidos.length === 1 ? "etiqueta" : "etiquetas"}
              {formato === "a4" && elegidos.length > 0 && ` · ${hojas.length} ${hojas.length === 1 ? "hoja" : "hojas"}`}
            </p>
            <Button type="button" disabled={elegidos.length === 0} onClick={() => window.print()}>
              <PrinterIcon />
              Imprimir
            </Button>
          </div>
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={guias}
            onChange={(event) => setGuias(event.target.checked)}
          />
          Guías de recorte (para papel común; desmárcalo en hojas adhesivas precortadas)
        </label>
        <p className="text-xs text-muted-foreground">
          En el cuadro de impresión elige escala 100 % (o «Tamaño real») y sin márgenes, para que cada etiqueta caiga
          en su lugar.
        </p>
      </div>

      {seleccionable && activos.length > 0 && (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
            <p className="text-sm font-medium">
              Activos ({seleccion.size} de {activos.length} seleccionados)
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSeleccion(new Set(activos.map((a) => a.id)))}>
                Todos
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSeleccion(new Set())}>
                Ninguno
              </Button>
            </div>
          </div>
          <ul className="max-h-72 divide-y overflow-y-auto">
            {activos.map((activo) => (
              <li key={activo.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-muted/50 sm:px-6">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={seleccion.has(activo.id)}
                    onChange={() => alternar(activo.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{activo.nombreActivo}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{activo.codigoPatrimonial}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium print:hidden">Vista previa</p>
        <div className="overflow-x-auto print:overflow-visible">
          {elegidos.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground print:hidden">
              Selecciona al menos un activo.
            </p>
          ) : formato === "a4" ? (
            // En pantalla las hojas van sobre un fondo gris, como en la vista
            // previa de impresión; la hoja en sí no lleva borde ni margen.
            <div className="w-fit space-y-6 rounded-2xl bg-muted p-6 print:space-y-0 print:rounded-none print:bg-transparent print:p-0">
              {hojas.map((hoja, indiceHoja) => (
                // 296 mm y no 297: con la altura exacta del A4 el redondeo del
                // navegador empuja una página en blanco entre hojas.
                <div
                  key={indiceHoja}
                  className="grid h-[296mm] w-[210mm] grid-cols-[repeat(3,70mm)] grid-rows-[repeat(8,37mm)] bg-white shadow-md print:break-after-page print:shadow-none print:last:break-after-auto"
                >
                  {hoja.map((activo, indice) =>
                    activo ? (
                      <EtiquetaActivo
                        key={activo.id}
                        activo={activo}
                        formato="a4"
                        className={cn(guias && clasesGuia(indice))}
                      />
                    ) : (
                      <div key={`vacia-${indice}`} />
                    )
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 print:block">
              {elegidos.map((activo) => (
                <EtiquetaActivo
                  key={activo.id}
                  activo={activo}
                  formato="rollo"
                  className={cn(
                    "rounded-md border shadow-sm print:break-after-page print:last:break-after-auto print:rounded-none print:shadow-none",
                    guias ? "border-dashed border-gray-400" : "print:border-0"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
