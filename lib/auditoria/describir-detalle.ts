import { ROL_USUARIO_LABELS } from "@/lib/usuarios/labels";
import { TIPO_DOCUMENTO_LABELS } from "@/lib/activos/labels";

function asRecord(detalle: unknown): Record<string, unknown> {
  return detalle && typeof detalle === "object" ? (detalle as Record<string, unknown>) : {};
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function join(partes: (string | null | false | undefined)[]): string {
  return partes.filter((p): p is string => Boolean(p)).join(", ");
}

// Fase 33, ampliada: traduce el detalle JSON de cada AuditoriaLog (ver
// registrarAuditoria en actions.ts de Activo/Documento/Responsable/Usuario)
// a una oración legible para un administrador que no conoce la forma interna
// de ese JSON. Los campos que usa acá (email, cargo, sede, código
// patrimonial, responsable, etc.) los capturan esas mismas actions al
// momento de escribir el log — antes solo guardaban el nombre, así que no
// hay forma de mostrar más para registros históricos ya escritos con ese
// detalle más corto (el JSON viejo simplemente no tiene esos campos). El
// volcado crudo queda como tooltip (ver resumenDetalleCrudo) para quien
// necesite el valor exacto.
export function describirDetalleAuditoria(entidad: string, accion: string, detalleRaw: unknown): string {
  const d = asRecord(detalleRaw);

  if (entidad === "Usuario") {
    const nombre = str(d.nombre) ?? "—";
    const email = str(d.email);
    const rol = str(d.rol);
    const rolLabel = rol ? (ROL_USUARIO_LABELS[rol] ?? rol) : null;

    if (accion === "CREAR") {
      return `Se creó el usuario «${nombre}»${email ? ` (${email})` : ""}${rolLabel ? ` con rol ${rolLabel}` : ""}.`;
    }
    if (accion === "ACTUALIZAR") {
      const estado = typeof d.estado === "boolean" ? (d.estado ? "Activo" : "Inactivo") : null;
      const partes = join([rolLabel && `rol ${rolLabel}`, estado && `estado ${estado}`]);
      return `Se actualizó a «${nombre}»${partes ? ` — ${partes}` : ""}.`;
    }
    if (accion === "ELIMINAR") {
      return `Se eliminó al usuario «${nombre}»${email ? ` (${email})` : ""}.`;
    }
  }

  if (entidad === "Responsable") {
    const nombre = str(d.nombre) ?? "—";
    const email = str(d.email);
    const cargo = str(d.cargo);
    const sede = str(d.sede);
    const contexto = join([email, cargo && `cargo ${cargo}`, sede && `sede ${sede}`]);

    if (accion === "CREAR") {
      return `Se creó el responsable «${nombre}»${contexto ? ` (${contexto})` : ""}.`;
    }
    if (accion === "ACTUALIZAR") {
      return `Se actualizaron los datos de «${nombre}»${contexto ? ` — ${contexto}` : ""}.`;
    }
    if (accion === "ELIMINAR") {
      return `Se eliminó al responsable «${nombre}»${contexto ? ` (${contexto})` : ""}.`;
    }
  }

  if (entidad === "Activo") {
    const nombreActivo = str(d.nombreActivo) ?? "este activo";
    const codigo = str(d.codigoPatrimonial);
    const codigoSufijo = codigo ? ` (${codigo})` : "";

    if (accion === "DAR_DE_ALTA") {
      const tipo = str(d.tipo);
      const sede = str(d.sede);
      const contexto = join([tipo, sede && `sede ${sede}`]);
      return `Se dio de alta el activo «${nombreActivo}»${codigoSufijo}${contexto ? ` — ${contexto}` : ""}.`;
    }
    if (accion === "DAR_DE_BAJA") return `Se dio de baja el activo «${nombreActivo}»${codigoSufijo}.`;
    if (accion === "TRANSFERIR") return `Se transfirió «${nombreActivo}»${codigoSufijo} a otra sede.`;
    if (accion === "ASIGNAR") {
      const responsable = str(d.responsable);
      return `Se asignó «${nombreActivo}»${codigoSufijo} a ${responsable ?? "un responsable"}.`;
    }
    if (accion === "ELIMINAR") return `Se eliminó el activo «${nombreActivo}»${codigoSufijo}.`;
    if (accion === "ACTUALIZAR") {
      if (d.motivo === "desasignar_responsable") {
        const responsableAnterior = str(d.responsableAnterior);
        return `Se desasignó a ${responsableAnterior ?? "el responsable"} de «${nombreActivo}»${codigoSufijo}.`;
      }
      return `Se actualizaron los datos de «${nombreActivo}»${codigoSufijo}.`;
    }
  }

  if (entidad === "Documento") {
    const nombreOriginal = str(d.nombreOriginal) ?? "—";
    const tipoDocumento = str(d.tipoDocumento);
    const tipoLabel = tipoDocumento ? (TIPO_DOCUMENTO_LABELS[tipoDocumento] ?? tipoDocumento) : null;
    const activoNombre = str(d.activoNombre);
    const codigo = str(d.codigoPatrimonial);
    const activoContexto = activoNombre ? `${activoNombre}${codigo ? ` (${codigo})` : ""}` : null;

    if (accion === "ADJUNTAR_DOCUMENTO") {
      return `Se adjuntó el documento «${nombreOriginal}»${tipoLabel ? ` (${tipoLabel})` : ""}${activoContexto ? ` a «${activoContexto}»` : ""}.`;
    }
    if (accion === "ELIMINAR_DOCUMENTO") {
      return `Se eliminó el documento «${nombreOriginal}»${activoContexto ? ` de «${activoContexto}»` : ""}.`;
    }
  }

  // Combinación no contemplada arriba (o detalle vacío/con forma antigua):
  // volcado crudo en vez de un texto vacío o engañoso.
  return resumenDetalleCrudo(detalleRaw);
}

// Tooltip con el JSON tal cual, para quien necesite el valor exacto detrás
// de la oración (ej. depurar un registro raro).
export function resumenDetalleCrudo(detalle: unknown): string {
  const d = asRecord(detalle);
  const entries = Object.entries(d).filter(([, v]) => v != null);
  if (entries.length === 0) return "—";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" · ");
}
