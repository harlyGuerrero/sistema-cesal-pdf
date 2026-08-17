import { prisma } from "@/lib/db";
import type {
  Prisma,
  PrioridadNotificacion,
  TipoMovimiento,
  TipoNotificacion,
} from "@/lib/generated/prisma/client";

type NotificacionClient = Pick<typeof prisma, "notificacion" | "usuario">;

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
  await client.notificacion.create({
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
  await client.notificacion.createMany({ data });
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
