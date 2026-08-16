import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import type { RolUsuario } from "@/lib/generated/prisma/client";

// Fase 13: nombre de cookie compartido entre este archivo (server
// components/actions, via next/headers) y proxy.ts (via NextRequest.cookies,
// que no puede importar next/headers) — ver Runtime en la doc de Proxy.
export const SESSION_COOKIE = "cesal_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

interface SessionTokenPayload {
  sub: string;
  exp: number;
}

export interface SessionUsuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Falta AUTH_SECRET en las variables de entorno (ver .env.example).");
  }
  return secret;
}

function sign(payload: SessionTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

// Función pura (sin next/headers) para que proxy.ts pueda reusarla al leer
// la cookie desde NextRequest en vez de desde cookies().
export function verifySessionToken(token: string): SessionTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) {
    return null;
  }

  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
  if (payload.exp < Date.now()) return null;

  return payload;
}

export async function createSession(usuarioId: string): Promise<void> {
  const token = sign({ sub: usuarioId, exp: Date.now() + SESSION_DURATION_MS });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Se resuelve contra la base en cada llamada (no solo el token firmado) para
// que desactivar un Usuario (estado=false) le corte el acceso de inmediato,
// sin esperar a que expire la sesión de 7 días.
export async function getSessionUsuario(): Promise<SessionUsuario | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub } });
  if (!usuario || !usuario.estado) return null;

  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
}

// Defensa en profundidad para server actions sensibles: proxy.ts ya protege
// todo el sistema salvo /login, pero la doc de Proxy de Next.js recomienda
// no depender solo de eso (un cambio de matcher podría dejar una ruta sin
// cubrir sin que se note). Usar en acciones que requieren cualquier sesión.
export async function requireSessionUsuario(): Promise<SessionUsuario> {
  const usuario = await getSessionUsuario();
  if (!usuario) redirect("/login");
  return usuario;
}

// Igual que arriba, pero además exige rol SUPER_ADMIN — usar en las
// acciones de gestión de Usuario (crear/editar/eliminar cuentas, cambiar
// roles), el único límite real entre los dos roles (ver CLAUDE.md).
export async function requireSuperAdmin(): Promise<SessionUsuario> {
  const usuario = await requireSessionUsuario();
  if (usuario.rol !== "SUPER_ADMIN") redirect("/");
  return usuario;
}

export async function getCurrentUsuarioId(): Promise<string | null> {
  const usuario = await getSessionUsuario();
  return usuario?.id ?? null;
}
