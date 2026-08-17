import { redirect } from "next/navigation";
import { getSessionUsuario } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const usuario = await getSessionUsuario();
  if (usuario) {
    redirect("/");
  }

  const { from } = await searchParams;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-3xl">
        <LoginForm from={from} />
      </div>
      <footer className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-2 text-[11px] text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Sistema Patrimonial de Control de Activos Fijos. Todos los derechos
          reservados.
        </p>
        <p className="flex gap-4 tracking-wide uppercase">
          <span>Privacidad</span>
          <span>Términos</span>
          <span>Soporte</span>
        </p>
      </footer>
    </main>
  );
}
