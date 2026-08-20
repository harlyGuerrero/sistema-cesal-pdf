import { Client } from "pg";
import { EventEmitter } from "node:events";

// Fase 50: canal de Postgres LISTEN/NOTIFY para push en vivo — pg ya es
// dependencia directa del proyecto (Prisma 7 lo usa vía @prisma/adapter-pg,
// ver lib/db.ts), así que esto reusa el mismo driver en vez de sumar un
// servicio externo de pub/sub. LISTEN necesita una conexión dedicada, sin
// pool (Prisma nunca podría sostenerla) — un solo Client por proceso, con el
// mismo patrón de singleton en globalThis que lib/db.ts usa para el hot
// reload de Next.js en dev.
export interface NotificacionPushPayload {
  usuarioId: string;
  notificacionId: string;
}

const CANAL = "notificaciones";

const globalForListener = globalThis as unknown as {
  notificacionesEmitter?: EventEmitter;
  notificacionesListenReady?: Promise<void>;
};

const emitter = globalForListener.notificacionesEmitter ?? new EventEmitter();
if (!globalForListener.notificacionesEmitter) {
  // Muchas conexiones SSE simultáneas se suscriben al mismo emitter — el
  // límite por defecto de 10 listeners de Node no aplica acá.
  emitter.setMaxListeners(0);
  globalForListener.notificacionesEmitter = emitter;
}

// Promise cacheada (no un booleano) para que dos suscriptores casi
// simultáneos no abran dos conexiones LISTEN en paralelo mientras la
// primera todavía está conectando.
function ensureListening(): Promise<void> {
  if (!globalForListener.notificacionesListenReady) {
    globalForListener.notificacionesListenReady = (async () => {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      await client.query(`LISTEN ${CANAL}`);

      client.on("notification", (msg) => {
        if (!msg.payload) return;
        try {
          const payload = JSON.parse(msg.payload) as NotificacionPushPayload;
          emitter.emit(CANAL, payload);
        } catch {
          // Payload malformado — no debería pasar (siempre lo escribe
          // notificarPush), pero un LISTEN caído por esto sería peor que
          // perder un solo evento.
        }
      });

      client.on("error", (error) => {
        console.error("[notificaciones] conexión LISTEN perdida:", error);
        // Permite que el próximo suscriptor reintente conectar.
        globalForListener.notificacionesListenReady = undefined;
      });
    })();
  }
  return globalForListener.notificacionesListenReady;
}

// El lado de "emitir" NO abre una conexión pg propia (sería una conexión
// nueva por cada notificación creada) — lib/notificaciones/crear.ts
// (emitirPush) llama `pg_notify` como raw query de Prisma, reusando el
// pool/transacción que ya está insertando la fila. Este módulo es solo el
// lado de "escuchar".
export const CANAL_NOTIFICACIONES = CANAL;

// Usado por app/api/notificaciones/stream/route.ts — un callback por
// conexión SSE, filtrado ahí mismo (acá se recibe todo el canal, sin
// distinguir destinatario) contra el usuarioId de la sesión.
export async function suscribirseANotificaciones(
  onEvento: (payload: NotificacionPushPayload) => void
): Promise<() => void> {
  await ensureListening();
  emitter.on(CANAL, onEvento);
  return () => emitter.off(CANAL, onEvento);
}
