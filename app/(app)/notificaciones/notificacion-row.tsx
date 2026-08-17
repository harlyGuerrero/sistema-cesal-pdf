"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TIPO_NOTIFICACION_META } from "@/lib/notificaciones/labels";
import { resolverUrlNotificacion } from "@/lib/notificaciones/url";
import { cn } from "@/lib/utils";
import { marcarLeidaAction } from "./actions";

export interface NotificacionListado {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidad: string | null;
  entidadId: string | null;
  leida: boolean;
  createdAt: Date;
}

export function NotificacionRow({ notificacion }: { notificacion: NotificacionListado }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const meta = TIPO_NOTIFICACION_META[notificacion.tipo];
  const Icon = meta.icon;
  const href = resolverUrlNotificacion(notificacion.entidad, notificacion.entidadId);

  function marcarLeida() {
    if (notificacion.leida) return;
    startTransition(async () => {
      await marcarLeidaAction(notificacion.id);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 transition-colors",
        !notificacion.leida && "border-primary/20 bg-primary/5"
      )}
    >
      <span
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `color-mix(in oklch, ${meta.color} 15%, transparent)`, color: meta.color }}
      >
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className={cn("text-sm", !notificacion.leida ? "font-semibold" : "font-medium")}>
            {href ? (
              <Link href={href} onClick={marcarLeida} className="hover:underline">
                {notificacion.titulo}
              </Link>
            ) : (
              notificacion.titulo
            )}
          </p>
          {!notificacion.leida && (
            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{notificacion.mensaje}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span>{notificacion.createdAt.toLocaleString("es-PE")}</span>
          <span aria-hidden="true">·</span>
          <span className={notificacion.leida ? "text-muted-foreground" : "font-medium text-primary"}>
            {notificacion.leida ? "Leída" : "No leída"}
          </span>
          {!notificacion.leida && (
            <button
              type="button"
              disabled={isPending}
              onClick={marcarLeida}
              className="ml-auto text-primary hover:underline disabled:opacity-50"
            >
              Marcar como leída
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
