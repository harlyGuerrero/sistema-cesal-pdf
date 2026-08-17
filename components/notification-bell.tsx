"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

// Fase 49: campana del header (punto 8/9 del spec) — muestra las últimas
// notificaciones del usuario actual, resueltas server-side en el layout (ver
// app/(app)/layout.tsx) y pasadas acá ya listas; este componente solo
// interactúa (marcar leída, marcar todas) vía Server Action + router.refresh(),
// mismo patrón que MiCuentaForm.
export function NotificationBell({
  notificaciones,
  unreadCount,
}: {
  notificaciones: NotificacionResumen[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function marcarLeida(id: string) {
    startTransition(async () => {
      await marcarLeidaAction(id);
      router.refresh();
    });
  }

  function marcarTodas() {
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
