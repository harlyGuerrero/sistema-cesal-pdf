import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Fase 13: todo el sistema queda detrás de login salvo /login mismo (ver
// CLAUDE.md) — el matcher de abajo es una lista negra (todo menos /login y
// los assets internos de Next/estáticos), no una lista blanca de rutas
// protegidas, para que una ruta nueva quede protegida por defecto en vez de
// depender de acordarse de agregarla acá (ver advertencia de la doc de
// Proxy de Next.js 16 sobre matchers mal configurados dejando una ruta
// desprotegida sin que se note).
//
// Resuelve contra la base en cada request (no solo el token firmado) para
// que desactivar un Usuario le corte el acceso ya mismo — mismo criterio
// que getSessionUsuario en lib/auth/session.ts, pero implementado acá
// aparte porque Proxy lee la cookie desde NextRequest, no desde
// next/headers.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? verifySessionToken(token) : null;

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub } });
  if (!usuario || !usuario.estado) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  // Único límite real entre los dos roles (ver CLAUDE.md): solo SUPER_ADMIN
  // gestiona Usuario. Todo lo demás es CRUD completo para ambos roles.
  if (pathname.startsWith("/usuarios") && usuario.rol !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
