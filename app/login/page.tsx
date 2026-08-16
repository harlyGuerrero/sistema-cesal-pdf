import { redirect } from "next/navigation";
import { getSessionUsuario } from "@/lib/auth/session";
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
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            C
          </div>
          <h1 className="text-xl font-medium">Sistema patrimonial CESAL</h1>
          <p className="text-sm text-muted-foreground">Inicia sesión para continuar.</p>
        </div>
        <LoginForm from={from} />
      </div>
    </main>
  );
}
