import { CircleDotIcon, type LucideIcon } from "lucide-react";
import type { TipoMovimiento } from "@/lib/generated/prisma/client";
import { ESTADO_PATRIMONIAL_LABELS, TIPO_MOVIMIENTO_LABELS } from "@/lib/activos/labels";
import { MOVIMIENTO_META } from "@/lib/activos/movimiento-meta";
import { nombreCompleto } from "@/lib/nombre-completo";
import type { MovimientoDetalleRow } from "@/lib/activos/movimientos";

// Fase 59: traduce un Movimiento a lenguaje natural para el historial de
// /movimientos. Solo usa lo que el Movimiento guardó (snapshots antes/
// después, motivo, observaciones): nunca infiere un responsable, ubicación,
// motivo o estado que no esté registrado, y nunca narra un cambio que los
// snapshots no muestren.
//
// Caso real que obliga a mirar los snapshots y no solo el tipo: editar un
// activo cambiando solo su estado (ej. Asignado -> Disponible desde el
// formulario) se guarda como CAMBIO_UBICACION (ver inferirTipoDeEdicion en
// movimientos.ts) aunque la ubicación no haya cambiado. Acá eso se cuenta
// como "Estado cambiado", que es lo que de verdad pasó; el tipo guardado no
// se toca y sigue mandando en el filtro por tipo.

export interface MovimientoNarrable extends MovimientoDetalleRow {
  tipo: TipoMovimiento;
  motivo: string | null;
  observaciones: string | null;
}

export interface CategoriaVisible {
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface FilaDetalle {
  label: string;
  antes: string | null;
  despues: string;
  cambio: boolean;
}

export interface NarrativaMovimiento {
  titulo: string;
  categoria: CategoriaVisible;
  // Frases cortas de "qué cambió", en orden de importancia.
  resumen: string[];
  // Persona que quedó como responsable en este movimiento, solo si el
  // movimiento la registró (asignación / reasignación).
  asignadoA: string | null;
  detalles: FilaDetalle[];
}

const CAMBIO_DE_ESTADO: CategoriaVisible = { label: "Cambio de estado", icon: CircleDotIcon, color: "var(--color-neutral)" };

function persona(valor: { nombres: string; apellidos: string } | null): string | null {
  return valor ? nombreCompleto(valor) : null;
}

function estadoLabel(estado: string | null): string | null {
  return estado ? (ESTADO_PATRIMONIAL_LABELS[estado] ?? estado) : null;
}

function ubicacion(...partes: ({ name: string } | null)[]): string | null {
  const nombres = partes.filter((p): p is { name: string } => p !== null).map((p) => p.name);
  return nombres.length > 0 ? nombres.join(" › ") : null;
}

export function narrarMovimiento(m: MovimientoNarrable): NarrativaMovimiento {
  const responsableAntes = persona(m.responsableAnterior);
  const responsableDespues = persona(m.responsableNuevo);
  const ubicacionAntes = ubicacion(m.sedeAnterior, m.unidadOperativaAnterior, m.ambienteAnterior);
  const ubicacionDespues = ubicacion(m.sedeNueva, m.unidadOperativaNueva, m.ambienteNuevo);
  const estadoAntes = estadoLabel(m.estadoAnterior);
  const estadoDespues = estadoLabel(m.estadoNuevo);

  const cambioResponsable = responsableAntes !== responsableDespues;
  const cambioUbicacion = ubicacionAntes !== ubicacionDespues;
  const cambioSede = (m.sedeAnterior?.name ?? null) !== (m.sedeNueva?.name ?? null);
  const cambioEstado = estadoAntes !== estadoDespues;

  const { icon, color } = MOVIMIENTO_META[m.tipo];
  let categoria: CategoriaVisible = { label: TIPO_MOVIMIENTO_LABELS[m.tipo] ?? m.tipo, icon, color };
  let titulo: string;
  const resumen: string[] = [];
  // Qué ya cuenta el título, para no repetirlo en el resumen.
  let tituloCubre: "responsable" | "ubicacion" | "estado" | null = null;

  switch (m.tipo) {
    case "ALTA":
      titulo = "Activo registrado en el sistema";
      resumen.push(`Ubicación inicial: ${ubicacionDespues ?? "No especificada"}`);
      if (estadoDespues) resumen.push(`Estado inicial: ${estadoDespues}`);
      break;

    case "ASIGNACION":
      titulo = responsableDespues ? `Activo asignado a ${responsableDespues}` : "Activo asignado";
      tituloCubre = "responsable";
      break;

    case "REASIGNACION":
      titulo =
        responsableAntes && responsableDespues
          ? `Responsable cambiado de ${responsableAntes} a ${responsableDespues}`
          : responsableDespues
            ? `Activo asignado a ${responsableDespues}`
            : "Responsable cambiado";
      tituloCubre = "responsable";
      break;

    case "CAMBIO_RESPONSABLE":
      if (responsableDespues) {
        titulo = responsableAntes
          ? `Responsable cambiado de ${responsableAntes} a ${responsableDespues}`
          : `Activo asignado a ${responsableDespues}`;
      } else {
        titulo = responsableAntes ? `Se retiró la asignación a ${responsableAntes}` : "Se retiró la asignación del activo";
      }
      tituloCubre = "responsable";
      break;

    case "TRANSFERENCIA":
      titulo = `Sede cambiada de ${m.sedeAnterior?.name ?? "una sede no especificada"} a ${m.sedeNueva?.name ?? "una sede no especificada"}`;
      // El título solo nombra la sede; si además cambió unidad o ambiente,
      // el resumen muestra la ubicación completa.
      if (cambioUbicacion) resumen.push(`Nueva ubicación: ${ubicacionDespues ?? "No especificada"}`);
      tituloCubre = "ubicacion";
      break;

    case "CAMBIO_UBICACION":
      if (cambioUbicacion) {
        titulo = `Ubicación actualizada de ${ubicacionAntes ?? "una ubicación no especificada"} a ${ubicacionDespues ?? "una ubicación no especificada"}`;
        tituloCubre = "ubicacion";
      } else if (cambioEstado) {
        titulo = `Estado cambiado de ${estadoAntes ?? "No especificado"} a ${estadoDespues ?? "No especificado"}`;
        categoria = CAMBIO_DE_ESTADO;
        tituloCubre = "estado";
      } else {
        titulo = "Datos de ubicación registrados sin cambios";
      }
      break;

    case "MANTENIMIENTO":
      titulo = "Activo registrado en mantenimiento";
      tituloCubre = "estado";
      break;

    case "RETORNO_MANTENIMIENTO":
      titulo = estadoDespues ? `Activo salió de mantenimiento y quedó como ${estadoDespues}` : "Activo salió de mantenimiento";
      tituloCubre = "estado";
      break;

    case "BAJA":
      titulo = "Activo dado de baja";
      tituloCubre = "estado";
      if (m.motivo) resumen.push(`Motivo: ${m.motivo}`);
      break;

    case "REACTIVACION":
      titulo = estadoDespues ? `Activo reactivado como ${estadoDespues}` : "Activo reactivado";
      tituloCubre = "estado";
      break;
  }

  // Lo que cambió además de lo que cuenta el título (un mismo movimiento
  // guarda todos los snapshots, ej. una baja que también movió de sede).
  if (m.tipo !== "ALTA") {
    if (cambioResponsable && tituloCubre !== "responsable") {
      resumen.push(
        responsableDespues
          ? `Responsable: ${responsableAntes ?? "sin responsable anterior"} → ${responsableDespues}`
          : `Se retiró la asignación${responsableAntes ? ` a ${responsableAntes}` : ""}`
      );
    }
    if (cambioUbicacion && tituloCubre !== "ubicacion") {
      resumen.push(`Ubicación: ${ubicacionAntes ?? "no especificada"} → ${ubicacionDespues ?? "no especificada"}`);
    }
    if (cambioEstado && tituloCubre !== "estado") {
      resumen.push(`Estado: ${estadoAntes ?? "no especificado"} → ${estadoDespues ?? "no especificado"}`);
    }
  }

  const detalles: FilaDetalle[] = [];
  const esAlta = m.tipo === "ALTA";
  if (estadoAntes || estadoDespues) {
    detalles.push({
      label: esAlta ? "Estado inicial" : "Estado",
      antes: esAlta ? null : (estadoAntes ?? "No especificado"),
      despues: estadoDespues ?? "No especificado",
      cambio: cambioEstado,
    });
  }
  if (responsableAntes || responsableDespues) {
    detalles.push({
      label: "Responsable",
      antes: esAlta ? null : (responsableAntes ?? "Sin responsable anterior"),
      despues: responsableDespues ?? "Sin responsable",
      cambio: cambioResponsable,
    });
  }
  if (ubicacionAntes || ubicacionDespues) {
    detalles.push({
      label: esAlta ? "Ubicación inicial" : "Ubicación",
      antes: esAlta ? null : (ubicacionAntes ?? "No especificada"),
      despues: ubicacionDespues ?? "No especificada",
      cambio: cambioUbicacion || cambioSede,
    });
  }

  const asignadoA =
    (m.tipo === "ASIGNACION" || m.tipo === "REASIGNACION" || m.tipo === "CAMBIO_RESPONSABLE") && responsableDespues
      ? responsableDespues
      : null;

  return { titulo, categoria, resumen, asignadoA, detalles };
}

// "Huachipa › CETPRO - Huachipa" para la ubicación actual de un Activo.
export function ubicacionActual(activo: {
  sede: { name: string } | null;
  unidadOperativa: { name: string } | null;
  ambiente: { name: string } | null;
}): string | null {
  return ubicacion(activo.sede, activo.unidadOperativa, activo.ambiente);
}
