import Link from "next/link";
import { Suspense } from "react";
import { BellOffIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSessionUsuario } from "@/lib/auth/session";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { tiposPorCategoria } from "@/lib/notificaciones/labels";
import type { Prisma } from "@/lib/generated/prisma/client";
import { NotificacionesFilters } from "./notificaciones-filters";
import { NotificacionRow } from "./notificacion-row";

const PAGE_SIZE = 15;

// Fase 49: página completa de notificaciones (punto 11 del spec) — a
// diferencia del panel de la campana (últimas 8, sin paginar), acá se ve el
// historial completo del usuario, con filtro por leída/no leída y por
// categoría (ver CATEGORIA_NOTIFICACION_OPTIONS).
export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; categoria?: string; page?: string }>;
}) {
  const actor = await requireSessionUsuario();
  const { estado, categoria, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const tipos = categoria ? tiposPorCategoria(categoria) : null;
  const where: Prisma.NotificacionWhereInput = {
    usuarioId: actor.id,
    ...(estado === "no-leidas" ? { leida: false } : {}),
    ...(tipos ? { tipo: { in: tipos as Prisma.EnumTipoNotificacionFilter["in"] } } : {}),
  };

  const [notificaciones, total, unreadCount] = await Promise.all([
    prisma.notificacion.findMany({
      where,
      orderBy: [{ leida: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.notificacion.count({ where }),
    prisma.notificacion.count({ where: { usuarioId: actor.id, leida: false } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageBreadcrumb items={[{ label: "Notificaciones" }]} />
      <main className="space-y-6 p-6">
        <div>
          <h1 className="text-xl font-medium">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">Consulta las actividades y eventos relevantes del sistema.</p>
        </div>

        <Suspense fallback={<div className="h-9" />}>
          <NotificacionesFilters unreadCount={unreadCount} />
        </Suspense>

        {notificaciones.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
            <BellOffIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Todo está al día</p>
            <p className="text-sm text-muted-foreground">No tienes notificaciones pendientes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notificaciones.map((notificacion) => (
              <NotificacionRow key={notificacion.id} notificacion={notificacion} />
            ))}
          </div>
        )}

        {total > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} notificaciones
            </p>
            <div className="flex items-center gap-1">
              <PageButton page={page - 1} disabled={page <= 1} estado={estado} categoria={categoria}>
                «
              </PageButton>
              <span className="px-2">
                {page} / {totalPages}
              </span>
              <PageButton page={page + 1} disabled={page >= totalPages} estado={estado} categoria={categoria}>
                »
              </PageButton>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function buildHref(page: number, estado?: string, categoria?: string): string {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (categoria) params.set("categoria", categoria);
  params.set("page", String(page));
  return `/notificaciones?${params.toString()}`;
}

function PageButton({
  children,
  page,
  disabled,
  estado,
  categoria,
}: {
  children: React.ReactNode;
  page: number;
  disabled?: boolean;
  estado?: string;
  categoria?: string;
}) {
  const className =
    "flex size-7 shrink-0 items-center justify-center rounded-md text-sm text-foreground hover:bg-muted";
  if (disabled) return <span className={`${className} text-muted-foreground/50`}>{children}</span>;
  return (
    <Link href={buildHref(page, estado, categoria)} className={className}>
      {children}
    </Link>
  );
}
