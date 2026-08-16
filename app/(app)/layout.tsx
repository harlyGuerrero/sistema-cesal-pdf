import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center border-b px-4 print:hidden">
          <SidebarTrigger className="-ml-1" />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
