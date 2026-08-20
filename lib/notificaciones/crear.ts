import { prisma } from "@/lib/db";
import { CANAL_NOTIFICACIONES } from "@/lib/notificaciones/pg-listen";
import type {
  Prisma,
  PrioridadNotificacion,
  TipoMovimiento,
  TipoNotificacion,
} from "@/lib/generated/prisma/client";

type NotificacionClient = Pick<typeof prisma, "notificacion" | "usuario" | "$executeRaw">;

// Fase 50: pg_notify como raw query sobre el mismo `client` que ya está
// insertando la fila (el pool de Prisma o la tx en curso) — no abre una
// conexión pg aparte por cada notificación creada. Emitido dentro de una
// transacción, Postgres lo entrega recién al hacer COMMIT (comportamiento
// nativo de NOTIFY), así que nunca llega antes de que la fila sea visible
// para quien la escucha (ver app/api/notificaciones/stream/route.ts).
async function emitirPush(client: NotificacionClient, usuarioId: string, notificacionId: string): Promise<void> {
  const payload = JSON.stringify({ usuarioId, notificacionId });
  await client.$executeRaw`SELECT pg_notify(${CANAL_NOTIFICACIONES}, ${payload})`;
}

// Fase 49: mismo criterio que registrarAuditoria (lib/auditoria/registrar.ts)
// — recibe `client` para participar de la transacción de quien la llama.
export async function crearNotificacion(
  params: {
    usuarioId: string;
    tipo: TipoNotificacion;
    prioridad?: PrioridadNotificacion;
    titulo: string;
    mensaje: string;
    entidad?: string;
    entidadId?: string;
  },
  client: NotificacionClient = prisma
): Promise<void> {
  const creada = await client.notificacion.create({
    data: {
      usuarioId: params.usuarioId,
      tipo: params.tipo,
      prioridad: params.prioridad ?? "NORMAL",
      titulo: params.titulo,
      mensaje: params.mensaje,
      entidad: params.entidad ?? null,
      entidadId: params.entidadId ?? null,
    },
  });
  await emitirPush(client, creada.usuarioId, creada.id);
}

// Responsable (a quien se asigna un Activo) no tiene cuenta de acceso al
// sistema (ver CLAUDE.md) — no hay a quién mandarle una notificación
// personal cuando "se le asigna" un activo. En vez de eso, se avisa a todos
// los Usuario activos (quienes sí pueden actuar sobre el sistema),
// excluyendo a quien disparó la acción — no hace falta avisarte de lo que
// vos mismo acabás de hacer.
export async function crearNotificacionBroadcast(
  params: {
    tipo: TipoNotificacion;
    prioridad?: PrioridadNotificacion;
    titulo: string;
    mensaje: string;
    entidad?: string;
    entidadId?: string;
    excluirUsuarioId?: string;
  },
  client: NotificacionClient = prisma
): Promise<void> {
  const destinatarios = await client.usuario.findMany({
    where: {
      estado: true,
      ...(params.excluirUsuarioId ? { id: { not: params.excluirUsuarioId } } : {}),
    },
    select: { id: true },
  });
  if (destinatarios.length === 0) return;

  const data: Prisma.NotificacionCreateManyInput[] = destinatarios.map((usuario) => ({
    usuarioId: usuario.id,
    tipo: params.tipo,
    prioridad: params.prioridad ?? "NORMAL",
    titulo: params.titulo,
    mensaje: params.mensaje,
    entidad: params.entidad ?? null,
    entidadId: params.entidadId ?? null,
  }));
  // createManyAndReturn (no createMany) a propósito: necesitamos el id de
  // cada fila insertada para avisar por su canal a cada destinatario — un
  // solo pg_notify por broadcast no alcanza porque cada usuario escucha
  // filtrando por su propio usuarioId (ver suscribirseANotificaciones).
  const creadas = await client.notificacion.createManyAndReturn({ data, select: { id: true, usuarioId: true } });
  await Promise.all(creadas.map((n) => emitirPush(client, n.usuarioId, n.id)));
}

// Subconjunto de TipoMovimiento que amerita notificación — ALTA (ya se avisa
// implícitamente al confirmar/crear, no es una sorpresa) y REACTIVACION/
// RETORNO_MANTENIMIENTO (vuelta a la normalidad, no está en el alcance
// pedido) no generan ninguna.
const TIPO_MOVIMIENTO_A_NOTIFICACION: Partial<Record<TipoMovimiento, TipoNotificacion>> = {
  ASIGNACION: "ASIGNACION",
  REASIGNACION: "REASIGNACION",
  CAMBIO_RESPONSABLE: "CAMBIO_RESPONSABLE",
  TRANSFERENCIA: "CAMBIO_UBICACION",
  CAMBIO_UBICACION: "CAMBIO_UBICACION",
  MANTENIMIENTO: "MANTENIMIENTO",
  BAJA: "BAJA",
};

export interface ActivoNotificable {
  id: string;
  nombreActivo: string;
  codigoPatrimonial: string;
}

// Fase 49: mismo punto donde ya se decide movimientoTipoAAccionAuditoria
// (lib/activos/movimientos.ts) — traduce el TipoMovimiento ya inferido a una
// notificación, en vez de re-detectar "qué cambió" una segunda vez.
export async function crearNotificacionDesdeMovimiento(
  params: {
    tipoMovimiento: TipoMovimiento;
    activo: ActivoNotificable;
    actorId: string;
    responsableNombre?: string | null;
    sedeNombre?: string | null;
  },
  client: NotificacionClient = prisma
): Promise<void> {
  const tipo = TIPO_MOVIMIENTO_A_NOTIFICACION[params.tipoMovimiento];
  if (!tipo) return;

  const activoRef = `"${params.activo.nombreActivo}" (${params.activo.codigoPatrimonial})`;
  const { titulo, mensaje, prioridad } = construirTituloYMensaje(tipo, activoRef, params);

  await crearNotificacionBroadcast(
    {
      tipo,
      prioridad,
      titulo,
      mensaje,
      entidad: "Activo",
      entidadId: params.activo.id,
      excluirUsuarioId: params.actorId,
    },
    client
  );
}

function construirTituloYMensaje(
  tipo: TipoNotificacion,
  activoRef: string,
  params: { responsableNombre?: string | null; sedeNombre?: string | null }
): { titulo: string; mensaje: string; prioridad: PrioridadNotificacion } {
  switch (tipo) {
    case "ASIGNACION":
      return {
        titulo: "Activo asignado",
        mensaje: `Se asignó el activo ${activoRef} a ${params.responsableNombre ?? "un responsable"}.`,
        prioridad: "NORMAL",
      };
    case "REASIGNACION":
      return {
        titulo: "Activo reasignado",
        mensaje: `El activo ${activoRef} fue reasignado a ${params.responsableNombre ?? "otro responsable"}.`,
        prioridad: "NORMAL",
      };
    case "CAMBIO_RESPONSABLE":
      return {
        titulo: "Responsable actualizado",
        mensaje: `Se desasignó a ${params.responsableNombre ?? "el responsable"} del activo ${activoRef}.`,
        prioridad: "NORMAL",
      };
    case "CAMBIO_UBICACION":
      return {
        titulo: "Ubicación actualizada",
        mensaje: `El activo ${activoRef} cambió de ubicación${params.sedeNombre ? ` a ${params.sedeNombre}` : ""}.`,
        prioridad: "NORMAL",
      };
    case "MANTENIMIENTO":
      return {
        titulo: "Mantenimiento requerido",
        mensaje: `El activo ${activoRef} requiere mantenimiento.`,
        prioridad: "ALTA",
      };
    case "BAJA":
      return {
        titulo: "Activo dado de baja",
        mensaje: `El activo ${activoRef} fue dado de baja.`,
        prioridad: "ALTA",
      };
    default:
      // Inalcanzable: TIPO_MOVIMIENTO_A_NOTIFICACION solo mapea a estos 6.
      return { titulo: "Actualización de activo", mensaje: activoRef, prioridad: "NORMAL" };
  }
}
