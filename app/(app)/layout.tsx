import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BreadcrumbProvider } from "@/components/breadcrumb-context";
import { BreadcrumbSlot } from "@/components/breadcrumb-slot";
import { getSessionUsuario } from "@/lib/auth/session";

// Fase 13: layout de las pantallas autenticadas (todo salvo /login, que
// vive fuera de este route group a propósito — ver app/layout.tsx). proxy.ts
// ya redirige a /login sin sesión válida; este chequeo es la misma defensa
// en profundidad que en cada página de /usuarios, no la única barrera.
export default async function AuthenticatedLayout({ children }: LayoutProps<"/">) {
  const usuario = await getSessionUsuario();
  if (!usuario) {
    redirect("/login");
  }

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
          <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4 print:hidden">
            <SidebarTrigger className="-ml-1" />
            <BreadcrumbSlot />
          </header>
          {children}
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
