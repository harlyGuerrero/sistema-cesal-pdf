import { cn } from "@/lib/utils";

// Fase 67: etiqueta física de un activo. Recibe el SVG del código de barras
// ya generado en el servidor (lib/activos/codigo-barras.ts) para poder usarse
// también desde componentes de cliente, como la impresión por lote.
// Medidas en mm porque se imprimen tal cual:
// - rollo: 60 × 35 mm, una etiqueta por página (impresora de etiquetas).
// - a4: 70 × 37 mm, la hoja A4 de 24 etiquetas adhesivas (3 × 8).
export type FormatoEtiqueta = "a4" | "rollo";

export interface EtiquetaActivoDatos {
  nombreActivo: string;
  codigoPatrimonial: string;
  sede: string | null;
  codigoBarrasSvg: string;
}

export function EtiquetaActivo({
  activo,
  formato,
  className,
}: {
  activo: EtiquetaActivoDatos;
  formato: FormatoEtiqueta;
  className?: string;
}) {
  // El logo va como <img> y no como background-image: los navegadores no
  // imprimen fondos CSS salvo que se active «Gráficos de fondo».
  return (
    <div
      className={cn(
        "relative isolate flex flex-col justify-between overflow-hidden bg-white text-black",
        formato === "rollo" ? "h-[35mm] w-[60mm] px-[3mm] py-[2.5mm]" : "h-[37mm] w-[70mm] px-[4mm] py-[3mm]",
        className
      )}
    >
      {/* Marca de agua: tenue para no competir con el texto ni con el lector. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-desktop.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 w-[85%] max-w-none -translate-x-1/2 -translate-y-[62%] -rotate-12 opacity-[0.09]"
      />
      <div className="flex items-center justify-between gap-2 border-b border-[#006CB0]/30 pb-[0.8mm]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-desktop.svg" alt="CESAL" className="h-[3.6mm] w-auto" />
        <span className="truncate text-[5.5pt] leading-none font-medium tracking-wide text-[#006CB0] uppercase">
          {activo.sede ?? ""}
        </span>
      </div>
      <p className="line-clamp-2 text-[7pt] leading-tight font-semibold">{activo.nombreActivo}</p>
      {/* Recuadro blanco opaco: las barras quedan sobre fondo limpio (contraste
          y zona de silencio intactos), aunque la marca de agua pase por detrás. */}
      <div className="-mx-[1mm] flex flex-col items-center gap-[0.5mm] rounded-[1mm] bg-white px-[1mm] pt-[0.5mm]">
        {/* SVG generado a partir de nuestro propio código patrimonial. */}
        <div
          className="h-[11mm] w-full [&>svg]:h-full [&>svg]:w-full"
          role="img"
          aria-label={`Código de barras ${activo.codigoPatrimonial}`}
          dangerouslySetInnerHTML={{ __html: activo.codigoBarrasSvg }}
        />
        <span className="font-mono text-[7pt] leading-none font-medium tracking-wider">
          {activo.codigoPatrimonial}
        </span>
      </div>
    </div>
  );
}
