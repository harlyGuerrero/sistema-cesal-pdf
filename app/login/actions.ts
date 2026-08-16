"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

// Evita open redirect: "from" viene de un query param que un atacante podría
// controlar (ej. un link a /login?from=https://evil.com), así que solo se
// acepta una ruta relativa propia del sitio.
function safeRedirectTarget(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const from = formData.get("from") as string | null;

  if (!email || !password) {
    throw new Error("Email y contraseña son obligatorios.");
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  // Mismo mensaje para "no existe" y "contraseña incorrecta" — no revelar
  // si un email está registrado.
  if (!usuario || !usuario.estado || !(await verifyPassword(password, usuario.passwordHash))) {
    throw new Error("Credenciales inválidas.");
  }

  await createSession(usuario.id);
  redirect(safeRedirectTarget(from));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
