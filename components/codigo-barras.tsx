import { codigoBarrasSvg } from "@/lib/activos/codigo-barras";
import { cn } from "@/lib/utils";

// Fase 67: código de barras del activo (server component — el SVG se genera
// en el servidor con bwip-js). Siempre negro sobre blanco, también en modo
// oscuro: los lectores necesitan ese contraste. El SVG sale de nuestro propio
// código patrimonial, no de input del usuario, así que inyectarlo es seguro.
export function CodigoBarras({
  codigoPatrimonial,
  className,
  mostrarTexto = true,
}: {
  codigoPatrimonial: string;
  className?: string;
  mostrarTexto?: boolean;
}) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-1 rounded-md bg-white px-3 py-2 text-black", className)}>
      <div
        className="h-10 w-full [&>svg]:h-full [&>svg]:w-full"
        role="img"
        aria-label={`Código de barras ${codigoPatrimonial}`}
        dangerouslySetInnerHTML={{ __html: codigoBarrasSvg(codigoPatrimonial) }}
      />
      {mostrarTexto && <span className="font-mono text-xs font-medium tracking-wider">{codigoPatrimonial}</span>}
    </div>
  );
}
