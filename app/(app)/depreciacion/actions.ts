"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSessionUsuario } from "@/lib/auth/session";
import { formatPeriodo, type Periodo } from "@/lib/depreciacion/calculo";
import { MOTIVO_OMISION_LABELS } from "@/lib/depreciacion/labels";
import {
  ejecutarProcesamiento,
  planificarTrimestre,
  puedeProcesarDepreciacion,
  validarPeriodoObjetivo,
} from "@/lib/depreciacion/procesamiento";

// Fase 58: vista previa y ejecución del procesamiento trimestral. El cliente
// solo manda año y trimestre: costos, tasas e importes se recalculan acá, y
// el usuario sale de la sesión, nunca del formulario. Devuelven un resultado
// en vez de lanzar, porque en producción Next.js oculta el mensaje de los
// errores lanzados desde una server action.

export interface VistaPreviaFila {
  activoId: string;
  codigoPatrimonial: string;
  nombreActivo: string;
  tipoActivo: string;
  detalle: string;
  periodos?: number;
  desde?: string;
  hasta?: string;
  importeCentavos?: number;
  valorNetoFinalCentavos?: number;
}

export interface VistaPrevia {
  periodo: string;
  pendientes: VistaPreviaFila[];
  conErrores: VistaPreviaFila[];
  omitidos: VistaPreviaFila[];
  yaProcesados: number;
  periodosARegistrar: number;
  importeTotalCentavos: number;
}

export type ResultadoAction<T> = { ok: true; data: T } | { ok: false; error: string };

async function autorizar(input: { anio: unknown; trimestre: unknown }): Promise<
  { ok: true; periodo: Periodo; usuarioId: string } | { ok: false; error: string }
> {
  const usuario = await requireSessionUsuario();
  if (!puedeProcesarDepreciacion(usuario.rol)) {
    return { ok: false, error: "No tienes permiso para procesar la depreciación." };
  }
  const validacion = validarPeriodoObjetivo(input);
  if (!validacion.ok) return validacion;
  return { ok: true, periodo: validacion.periodo, usuarioId: usuario.id };
}

export async function previsualizarDepreciacionAction(input: {
  anio: number;
  trimestre: number;
}): Promise<ResultadoAction<VistaPrevia>> {
  const auth = await autorizar(input);
  if (!auth.ok) return auth;

  try {
    const plan = await planificarTrimestre(prisma, auth.periodo);
    const base = (activo: (typeof plan.pendientes)[number] | (typeof plan.conErrores)[number] | (typeof plan.omitidos)[number]) => ({
      activoId: activo.activoId,
      codigoPatrimonial: activo.codigoPatrimonial,
      nombreActivo: activo.nombreActivo,
      tipoActivo: activo.tipoActivo,
    });

    return {
      ok: true,
      data: {
        periodo: formatPeriodo(auth.periodo),
        pendientes: plan.pendientes.map((activo) => ({
          ...base(activo),
          detalle: "",
          periodos: activo.periodos.length,
          desde: formatPeriodo(activo.periodos[0]),
          hasta: formatPeriodo(activo.periodos.at(-1)!),
          importeCentavos: activo.periodos.reduce((total, p) => total + p.importeCentavos, 0),
          valorNetoFinalCentavos: activo.periodos.at(-1)!.valorNetoCentavos,
        })),
        conErrores: plan.conErrores.map((activo) => ({
          ...base(activo),
          detalle: activo.problemas.map((p) => p.mensaje).join(" "),
        })),
        omitidos: plan.omitidos.map((activo) => ({ ...base(activo), detalle: MOTIVO_OMISION_LABELS[activo.motivo] })),
        yaProcesados: plan.yaProcesados,
        periodosARegistrar: plan.periodosARegistrar,
        importeTotalCentavos: plan.importeTotalCentavos,
      },
    };
  } catch (error) {
    console.error("[depreciacion] Error al generar la vista previa", error);
    return { ok: false, error: "No se pudo generar la vista previa. Intenta de nuevo." };
  }
}

export interface ResumenProcesamiento {
  periodo: string;
  activosProcesados: number;
  periodosRegistrados: number;
  yaProcesados: number;
  omitidos: number;
  conErrores: number;
  importeTotalCentavos: number;
}

export async function procesarDepreciacionAction(input: {
  anio: number;
  trimestre: number;
}): Promise<ResultadoAction<ResumenProcesamiento>> {
  const auth = await autorizar(input);
  if (!auth.ok) return auth;

  try {
    const resultado = await ejecutarProcesamiento(auth.periodo, auth.usuarioId);
    revalidatePath("/depreciacion");
    revalidatePath("/activos/[id]", "page");
    revalidatePath("/activos/[id]/ficha", "page");
    return {
      ok: true,
      data: {
        periodo: formatPeriodo(resultado.objetivo),
        activosProcesados: resultado.activosProcesados,
        periodosRegistrados: resultado.periodosRegistrados,
        yaProcesados: resultado.yaProcesados,
        omitidos: resultado.omitidos,
        conErrores: resultado.conErrores,
        importeTotalCentavos: resultado.importeTotalCentavos,
      },
    };
  } catch (error) {
    // Unique (activoId, anio, trimestre) violada: otro proceso registró los
    // mismos periodos por fuera del lock. La transacción ya se revirtió
    // completa, así que reintentar es seguro.
    const codigo = (error as { code?: string } | null)?.code;
    console.error("[depreciacion] Error al procesar", { periodo: formatPeriodo(auth.periodo), codigo, error });
    if (codigo === "P2002") {
      return { ok: false, error: "Algunos periodos ya estaban registrados. No se guardó nada; vuelve a generar la vista previa." };
    }
    return { ok: false, error: "No se pudo procesar la depreciación. No se guardó ningún periodo." };
  }
}
