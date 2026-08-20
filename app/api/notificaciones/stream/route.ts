import { prisma } from "@/lib/db";
import { requireSessionUsuario } from "@/lib/auth/session";
import { suscribirseANotificaciones } from "@/lib/notificaciones/pg-listen";

// Fase 50: push en vivo de notificaciones vía Server-Sent Events — necesita
// el runtime de Node (conexión pg de larga duración, ver pg-listen.ts), no
// funciona en Edge.
export const runtime = "nodejs";

const HEARTBEAT_MS = 25_000;

export async function GET() {
  const actor = await requireSessionUsuario();
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("ready", { usuarioId: actor.id });

      // Heartbeat: sin esto, algunos proxies/navegadores cierran una
      // conexión SSE que no emite nada por un rato largo.
      heartbeat = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), HEARTBEAT_MS);

      unsubscribe = await suscribirseANotificaciones(async (payload) => {
        // El canal es compartido por todos los usuarios — cada conexión
        // filtra acá contra su propia sesión, nunca reenvía notificaciones
        // ajenas (ver crearNotificacionBroadcast).
        if (payload.usuarioId !== actor.id) return;

        const notificacion = await prisma.notificacion.findUnique({
          where: { id: payload.notificacionId },
          select: {
            id: true,
            tipo: true,
            titulo: true,
            mensaje: true,
            entidad: true,
            entidadId: true,
            leida: true,
            createdAt: true,
          },
        });
        if (notificacion) send("notificacion", notificacion);
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
