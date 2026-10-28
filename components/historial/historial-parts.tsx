import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Fase 59: piezas de presentación compartidas por las tablas de historial
// (Movimientos, historial del activo y Auditoría). Sin estado ni datos
// propios: reciben todo armado desde cada página.

export interface PestanaConteo {
  key: string;
  label: string;
  count: number;
  href: string;
  activa: boolean;
  icon?: LucideIcon;
  color?: string;
}

// Pestañas que filtran por tipo, cada una con cuántos registros tiene dentro
// de los demás filtros vigentes. Son enlaces: el filtro vive en la URL.
export function PestanasConteo({ pestanas, etiqueta }: { pestanas: PestanaConteo[]; etiqueta: string }) {
  return (
    <nav aria-label={etiqueta} className="-mx-1 overflow-x-auto px-1">
      <ul className="flex w-max gap-1">
        {pestanas.map(({ key, label, count, href, activa, icon: Icon, color }) => (
          <li key={key}>
            <Link
              href={href}
              scroll={false}
              aria-current={activa ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                activa ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {Icon && <Icon className="size-3.5" style={activa ? undefined : { color }} aria-hidden />}
              {label}
              <span className="tabular-nums">{count.toLocaleString("es-PE")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Chip tintado de 28px con el ícono del tipo (DESIGN.md, "el chip tintado").
export function IconoTipo({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
      aria-hidden
    >
      <Icon className="size-3.5" />
    </span>
  );
}

// Encabezado "Fecha" que alterna el orden, con la flecha del sentido actual.
export function EncabezadoOrden({ label, href, sentido }: { label: string; href: string; sentido: "asc" | "desc" }) {
  const Flecha = sentido === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <Link
      href={href}
      scroll={false}
      className="inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      title={sentido === "asc" ? "Más antiguos primero" : "Más recientes primero"}
    >
      {label}
      <Flecha className="size-3" aria-hidden />
    </Link>
  );
}

// Rejilla Antes / Ahora del detalle de una fila. `antes` null = no aplica
// (ej. un alta, que no tiene situación anterior).
export function RejillaCambios({
  filas,
}: {
  filas: { label: string; antes: string | null; despues: string; cambio: boolean }[];
}) {
  if (filas.length === 0) return null;
  const hayAntes = filas.some((fila) => fila.antes !== null);
  return (
    <div
      className={cn(
        "grid max-w-3xl gap-x-6 gap-y-1.5 text-sm",
        hayAntes ? "grid-cols-[8rem_minmax(0,16rem)_minmax(0,16rem)]" : "grid-cols-[8rem_minmax(0,32rem)]"
      )}
    >
      <span />
      {hayAntes && <span className="text-xs font-medium text-muted-foreground">Antes</span>}
      <span className="text-xs font-medium text-muted-foreground">{hayAntes ? "Ahora" : "Registrado"}</span>
      {filas.map((fila) => (
        <div key={fila.label} className="contents">
          <span className="text-muted-foreground">{fila.label}</span>
          {hayAntes && <span className={cn(!fila.cambio && "text-muted-foreground")}>{fila.antes ?? "No aplica"}</span>}
          <span className={cn(fila.cambio ? "font-medium" : "text-muted-foreground")}>
            {fila.despues}
            {!fila.cambio && fila.antes !== null && " (sin cambios)"}
          </span>
        </div>
      ))}
    </div>
  );
}

// Pares etiqueta / valor del detalle (motivo, observaciones, fecha exacta…).
export function DatosDetalle({ datos }: { datos: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid max-w-3xl grid-cols-[8rem_minmax(0,32rem)] gap-x-6 gap-y-1.5 text-sm">
      {datos.map((dato) => (
        <div key={dato.label} className="contents">
          <dt className="text-muted-foreground">{dato.label}</dt>
          <dd className="min-w-0 break-words">{dato.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ventana(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = [...new Set([1, totalPages, page - 1, page, page + 1])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push("ellipsis");
    result.push(p);
  });
  return result;
}

export function PaginacionHistorial({
  page,
  totalPages,
  total,
  pageSize,
  sustantivo,
  href,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  sustantivo: string;
  href: (page: number) => string;
}) {
  if (total === 0) return null;
  const boton = (activa: boolean, deshabilitada = false) =>
    cn(
      "flex size-8 shrink-0 items-center justify-center rounded-md text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      activa ? "bg-primary text-primary-foreground" : deshabilitada ? "text-muted-foreground/50" : "text-foreground hover:bg-muted"
    );
  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        Mostrando {((page - 1) * pageSize + 1).toLocaleString("es-PE")} a{" "}
        {Math.min(page * pageSize, total).toLocaleString("es-PE")} de {total.toLocaleString("es-PE")} {sustantivo}
      </p>
      {totalPages > 1 && (
        <nav aria-label="Paginación" className="flex items-center gap-1">
          {page <= 1 ? (
            <span className={boton(false, true)}>
              <ChevronLeftIcon className="size-4" aria-hidden />
            </span>
          ) : (
            <Link href={href(page - 1)} className={boton(false)} aria-label="Página anterior">
              <ChevronLeftIcon className="size-4" aria-hidden />
            </Link>
          )}
          {ventana(page, totalPages).map((entry, index) =>
            entry === "ellipsis" ? (
              <span key={`e-${index}`} className="px-1">
                …
              </span>
            ) : (
              <Link key={entry} href={href(entry)} className={boton(entry === page)} aria-current={entry === page ? "page" : undefined}>
                {entry}
              </Link>
            )
          )}
          {page >= totalPages ? (
            <span className={boton(false, true)}>
              <ChevronRightIcon className="size-4" aria-hidden />
            </span>
          ) : (
            <Link href={href(page + 1)} className={boton(false)} aria-label="Página siguiente">
              <ChevronRightIcon className="size-4" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

// Estado vacío que distingue "no hay nada todavía" de "el filtro no encontró".
export function VacioHistorial({
  icon: Icon,
  titulo,
  texto,
}: {
  icon: LucideIcon;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-medium">{titulo}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
