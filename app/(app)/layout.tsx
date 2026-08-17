import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BreadcrumbProvider } from "@/components/breadcrumb-context";
import { BreadcrumbSlot } from "@/components/breadcrumb-slot";
import { NotificationBell } from "@/components/notification-bell";
import { getSessionUsuario } from "@/lib/auth/session";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/db";

const NOTIFICACIONES_CAMPANA_TAKE = 8;

// Fase 13: layout de las pantallas autenticadas (todo salvo /login, que
// vive fuera de este route group a propósito — ver app/layout.tsx). proxy.ts
// ya redirige a /login sin sesión válida; este chequeo es la misma defensa
// en profundidad que en cada página de /usuarios, no la única barrera.
export default async function AuthenticatedLayout({ children }: LayoutProps<"/">) {
  const usuario = await getSessionUsuario();
  if (!usuario) {
    redirect("/login");
  }

  // Fase 49: se resuelve acá (no en cada página) porque la campana vive en
  // este header compartido — mismo criterio que getSessionUsuario arriba.
  const [notificaciones, unreadCount] = await Promise.all([
    prisma.notificacion.findMany({
      where: { usuarioId: usuario.id },
      orderBy: [{ leida: "asc" }, { createdAt: "desc" }],
      take: NOTIFICACIONES_CAMPANA_TAKE,
      select: { id: true, tipo: true, titulo: true, mensaje: true, entidad: true, entidadId: true, leida: true, createdAt: true },
    }),
    prisma.notificacion.count({ where: { usuarioId: usuario.id, leida: false } }),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar className="print:hidden" usuario={usuario} />
      {/* bg-transparent: deja ver el fondo con glow de CESAL definido en
          body (globals.css) a través del <main> de cada página — SidebarInset
          trae bg-background sólido por defecto, que lo tapaba entero. El
          header sí se queda opaco (bg-background explícito) para no heredar
          la transparencia: la barra fija con el breadcrumb no es "el main". */}
      <SidebarInset className="bg-transparent">
        <BreadcrumbProvider>
          <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-4 print:hidden">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border" aria-hidden="true" />
            <BreadcrumbSlot />
            <div className="ml-auto">
              <NotificationBell notificaciones={notificaciones} unreadCount={unreadCount} />
            </div>
          </header>
          {children}
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
