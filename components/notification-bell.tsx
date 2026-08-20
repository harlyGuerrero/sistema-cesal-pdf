"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TIPO_NOTIFICACION_META } from "@/lib/notificaciones/labels";
import { resolverUrlNotificacion } from "@/lib/notificaciones/url";
import { formatearTiempoRelativo } from "@/lib/notificaciones/tiempo-relativo";
import { marcarLeidaAction, marcarTodasLeidasAction } from "@/app/(app)/notificaciones/actions";
import { cn } from "@/lib/utils";

export interface NotificacionResumen {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidad: string | null;
  entidadId: string | null;
  leida: boolean;
  createdAt: Date;
}

const MAX_NOTIFICACIONES_PANEL = 8;

// Fase 50: campana del header (punto 8/9 del spec) — el layout (Server
// Component, ver app/(app)/layout.tsx) resuelve el estado inicial en cada
// navegación; a partir de ahí, un EventSource contra
// /api/notificaciones/stream (Postgres LISTEN/NOTIFY, ver
// lib/notificaciones/pg-listen.ts) agrega notificaciones nuevas sin esperar
// a recargar. Las props solo "siembran" el estado local (useEffect de
// resync más abajo) — el layout sigue siendo la fuente de verdad tras un
// router.refresh() (marcar leída, marcar todas, o simplemente navegar).
export function NotificationBell({
  notificaciones: notificacionesIniciales,
  unreadCount: unreadCountInicial,
}: {
  notificaciones: NotificacionResumen[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notificaciones, setNotificaciones] = useState(notificacionesIniciales);
  const [unreadCount, setUnreadCount] = useState(unreadCountInicial);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resincroniza con el layout server-side tras router.refresh()
    setNotificaciones(notificacionesIniciales);
    setUnreadCount(unreadCountInicial);
  }, [notificacionesIniciales, unreadCountInicial]);

  useEffect(() => {
    const eventSource = new EventSource("/api/notificaciones/stream");

    eventSource.addEventListener("notificacion", (event) => {
      const raw = JSON.parse((event as MessageEvent<string>).data) as NotificacionResumen;
      const nueva: NotificacionResumen = { ...raw, createdAt: new Date(raw.createdAt) };

      setNotificaciones((prev) => [nueva, ...prev].slice(0, MAX_NOTIFICACIONES_PANEL));
      setUnreadCount((prev) => prev + 1);
      toast(nueva.titulo, { description: nueva.mensaje });
    });

    return () => eventSource.close();
  }, []);

  function marcarLeida(id: string) {
    // Optimista: la campana no espera al roundtrip para dejar de marcar la
    // notificación como no leída — router.refresh() igual resincroniza todo
    // contra el servidor después.
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    startTransition(async () => {
      await marcarLeidaAction(id);
      router.refresh();
    });
  }

  function marcarTodas() {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    setUnreadCount(0);
    startTransition(async () => {
      await marcarTodasLeidasAction();
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] p-0 sm:w-96">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Notificaciones</span>
          <Link href="/notificaciones" className="text-xs text-primary hover:underline">
            Ver todas
          </Link>
        </div>

        {notificaciones.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
            <p className="text-sm font-medium">Todo está al día</p>
            <p className="text-xs text-muted-foreground">No tienes notificaciones pendientes.</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {notificaciones.map((notificacion) => {
              const meta = TIPO_NOTIFICACION_META[notificacion.tipo];
              const Icon = meta.icon;
              const href = resolverUrlNotificacion(notificacion.entidad, notificacion.entidadId);
              const onClick = () => {
                if (!notificacion.leida) marcarLeida(notificacion.id);
              };

              const contenido = (
                <div className="flex items-start gap-2.5 px-3 py-2.5">
                  <span
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${meta.color} 15%, transparent)`,
                      color: meta.color,
                    }}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className={cn("truncate text-sm", !notificacion.leida && "font-semibold")}>
                      {notificacion.titulo}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{notificacion.mensaje}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatearTiempoRelativo(notificacion.createdAt)}
                    </p>
                  </div>
                  {!notificacion.leida && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </div>
              );

              return (
                <li key={notificacion.id} className={cn("border-b last:border-0", !notificacion.leida && "bg-primary/5")}>
                  {href ? (
                    <Link href={href} onClick={onClick} className="block hover:bg-muted/60">
                      {contenido}
                    </Link>
                  ) : (
                    <button type="button" onClick={onClick} className="block w-full text-left hover:bg-muted/60">
                      {contenido}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <DropdownMenuSeparator className="my-0" />
        <div className="p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            disabled={isPending || unreadCount === 0}
            onClick={marcarTodas}
          >
            <CheckCheckIcon />
            Marcar todas como leídas
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
