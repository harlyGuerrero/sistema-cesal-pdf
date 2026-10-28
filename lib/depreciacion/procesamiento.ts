import { prisma } from "@/lib/db";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import type { Prisma, RolUsuario } from "@/lib/generated/prisma/client";
import {
  centavosATexto,
  compararPeriodos,
  formatPeriodo,
  periodoActual,
  planificarDepreciacion,
  type MotivoOmision,
  type Periodo,
  type PeriodoCalculado,
  type Problema,
} from "./calculo";
import { cargarHistorialesAgregados, cargarTasasPorTipo, historialDe, toActivoDepreciable } from "./consultas";
import { tasaATexto } from "./tasas";
import { sincronizarValoresContables } from "./valores-contables";

// Fase 58: procesamiento trimestral de la depreciación. La vista previa y la
// ejecución usan la misma función (planificarTrimestre), así lo que se
// confirma es exactamente lo que se mostró — pero la ejecución la vuelve a
// calcular dentro de su transacción, no recibe importes del cliente.

type Client = Prisma.TransactionClient;

// Permisos (ver CLAUDE.md / proxy.ts): el único límite entre los dos roles
// es la gestión de Usuario; procesar la depreciación es parte del trabajo
// patrimonial normal de cualquier administrador con sesión activa.
export function puedeProcesarDepreciacion(rol: RolUsuario | null | undefined): boolean {
  return rol === "ADMIN" || rol === "SUPER_ADMIN";
}

// Año/trimestre recibidos del cliente: enteros, trimestre 1..4, y nunca un
// trimestre que todavía no empezó (no se deprecia a futuro).
export function validarPeriodoObjetivo(
  input: { anio: unknown; trimestre: unknown },
  ahora: Date = new Date()
): { ok: true; periodo: Periodo } | { ok: false; error: string } {
  const anio = Number(input.anio);
  const trimestre = Number(input.trimestre);
  if (!Number.isInteger(anio) || anio < 1900 || anio > 2999) return { ok: false, error: "Año inválido." };
  if (!Number.isInteger(trimestre) || trimestre < 1 || trimestre > 4) return { ok: false, error: "Trimestre inválido." };
  const periodo = { anio, trimestre } as Periodo;
  const actual = periodoActual(ahora);
  if (compararPeriodos(periodo, actual) > 0) {
    return { ok: false, error: `No se puede procesar un trimestre futuro (el trimestre en curso es ${formatPeriodo(actual)}).` };
  }
  return { ok: true, periodo };
}

export interface ActivoEnPlan {
  activoId: string;
  codigoPatrimonial: string;
  nombreActivo: string;
  tipoActivo: string;
}

export interface PlanTrimestre {
  objetivo: Periodo;
  pendientes: (ActivoEnPlan & { periodos: PeriodoCalculado[] })[];
  conErrores: (ActivoEnPlan & { problemas: Problema[] })[];
  omitidos: (ActivoEnPlan & { motivo: MotivoOmision })[];
  yaProcesados: number;
  periodosARegistrar: number;
  importeTotalCentavos: number;
}

export async function planificarTrimestre(client: Client, objetivo: Periodo, ahora: Date = new Date()): Promise<PlanTrimestre> {
  const [activos, tasas, historiales] = await Promise.all([
    client.activo.findMany({
      select: {
        id: true,
        codigoPatrimonial: true,
        nombreActivo: true,
        tipoActivoId: true,
        tipoActivo: { select: { name: true } },
        costoAdquisicion: true,
        fechaAdquisicion: true,
        estadoPatrimonial: true,
      },
      orderBy: { codigoPatrimonial: "asc" },
    }),
    cargarTasasPorTipo(client),
    cargarHistorialesAgregados(client),
  ]);

  const plan: PlanTrimestre = {
    objetivo,
    pendientes: [],
    conErrores: [],
    omitidos: [],
    yaProcesados: 0,
    periodosARegistrar: 0,
    importeTotalCentavos: 0,
  };

  for (const activo of activos) {
    const info: ActivoEnPlan = {
      activoId: activo.id,
      codigoPatrimonial: activo.codigoPatrimonial,
      nombreActivo: activo.nombreActivo,
      tipoActivo: activo.tipoActivo.name,
    };
    const resultado = planificarDepreciacion(
      toActivoDepreciable(activo, tasas),
      historialDe(historiales, activo.id),
      objetivo,
      ahora
    );
    switch (resultado.tipo) {
      case "pendiente":
        plan.pendientes.push({ ...info, periodos: resultado.periodos });
        plan.periodosARegistrar += resultado.periodos.length;
        plan.importeTotalCentavos += resultado.periodos.reduce((total, p) => total + p.importeCentavos, 0);
        break;
      case "error":
        plan.conErrores.push({ ...info, problemas: resultado.problemas });
        break;
      case "omitido":
        plan.omitidos.push({ ...info, motivo: resultado.motivo });
        break;
      case "al_dia":
        plan.yaProcesados++;
        break;
    }
  }

  return plan;
}


export interface ResultadoProcesamiento {
  procesamientoId: string;
  objetivo: Periodo;
  activosProcesados: number;
  periodosRegistrados: number;
  yaProcesados: number;
  omitidos: number;
  conErrores: number;
  importeTotalCentavos: number;
}

// Núcleo transaccional, separado de ejecutarProcesamiento para poder
// probarlo dentro de una transacción que el test revierte. Todo o nada: si
// una inserción falla (ej. la unique por un periodo ya registrado por fuera
// de este flujo), se revierte el lote completo y no queda un procesamiento
// a medias.
export async function procesarTrimestreEn(
  tx: Client,
  objetivo: Periodo,
  usuarioId: string | null,
  ahora: Date = new Date()
): Promise<ResultadoProcesamiento> {
  // Lock consultivo de clave fija (58001): serializa procesamientos
  // simultáneos (dos administradores confirmando a la vez, o un doble clic)
  // para que el segundo lea lo que registró el primero y no intente insertar
  // los mismos periodos. Se libera solo al terminar la transacción.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(58001)`;

  const plan = await planificarTrimestre(tx, objetivo, ahora);

  const procesamiento = await tx.procesamientoDepreciacion.create({
    data: {
      anio: objetivo.anio,
      trimestre: objetivo.trimestre,
      usuarioId,
      activosProcesados: plan.pendientes.length,
      periodosRegistrados: plan.periodosARegistrar,
      yaProcesados: plan.yaProcesados,
      omitidos: plan.omitidos.length,
      conErrores: plan.conErrores.length,
      importeTotal: centavosATexto(plan.importeTotalCentavos),
    },
  });

  const filas = plan.pendientes.flatMap((activo) =>
    activo.periodos.map((periodo) => ({
      activoId: activo.activoId,
      anio: periodo.anio,
      trimestre: periodo.trimestre,
      costoBase: centavosATexto(periodo.costoBaseCentavos),
      tasaTrimestral: tasaATexto(periodo.tasaTrimestral),
      importeDepreciado: centavosATexto(periodo.importeCentavos),
      depreciacionAcumulada: centavosATexto(periodo.acumuladoCentavos),
      valorNeto: centavosATexto(periodo.valorNetoCentavos),
      procesamientoId: procesamiento.id,
    }))
  );
  if (filas.length > 0) {
    await tx.depreciacionPeriodo.createMany({ data: filas });
  }
  // Fase 60: el valor contable / actual de cada activo procesado pasa a ser
  // su nuevo valor neto, en la misma transacción que registra los periodos.
  await sincronizarValoresContables(
    tx,
    plan.pendientes.map((activo) => activo.activoId)
  );

  await registrarAuditoria(
    {
      accion: "PROCESAR_DEPRECIACION",
      entidad: "ProcesamientoDepreciacion",
      entidadId: procesamiento.id,
      detalle: {
        periodo: formatPeriodo(objetivo),
        activosProcesados: plan.pendientes.length,
        periodosRegistrados: plan.periodosARegistrar,
        yaProcesados: plan.yaProcesados,
        omitidos: plan.omitidos.length,
        conErrores: plan.conErrores.length,
        importeTotal: centavosATexto(plan.importeTotalCentavos),
      },
      usuarioId,
    },
    tx
  );

  return {
    procesamientoId: procesamiento.id,
    objetivo,
    activosProcesados: plan.pendientes.length,
    periodosRegistrados: plan.periodosARegistrar,
    yaProcesados: plan.yaProcesados,
    omitidos: plan.omitidos.length,
    conErrores: plan.conErrores.length,
    importeTotalCentavos: plan.importeTotalCentavos,
  };
}

export async function ejecutarProcesamiento(objetivo: Periodo, usuarioId: string): Promise<ResultadoProcesamiento> {
  return prisma.$transaction((tx) => procesarTrimestreEn(tx, objetivo, usuarioId), {
    maxWait: 10_000,
    timeout: 120_000,
  });
}
