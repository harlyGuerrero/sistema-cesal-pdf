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
      <div className="w-full max-w-3xl">
        <LoginForm from={from} />
      </div>
    </main>
  );
}
