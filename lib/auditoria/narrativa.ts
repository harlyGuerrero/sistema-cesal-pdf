import { ROL_USUARIO_LABELS } from "@/lib/usuarios/labels";
import { TIPO_DOCUMENTO_LABELS } from "@/lib/activos/labels";
import { formatSoles, parseCentavos } from "@/lib/depreciacion/calculo";
import { TIPO_ACCION_AUDITORIA_LABELS } from "./labels";

// Fase 59: un registro de Auditoría contado en castellano llano para
// /auditoria. La tabla ya muestra quién lo hizo en su propia columna, así
// que el título va sin sujeto («Asignó un activo a Sergio»). Solo usa lo que
// el registro guardó en `detalle`: si una acción no guarda qué cambió (ej.
// editar un activo), lo dice en vez de inventarlo. describir-detalle.ts
// queda para la exportación a Excel, que necesita una sola oración.

export const ENTIDAD_AUDITORIA_LABELS: Record<string, string> = {
  Activo: "Activo",
  Documento: "Documento",
  Responsable: "Responsable",
  Usuario: "Cuenta de usuario",
  Sede: "Sede",
  UnidadOperativa: "Unidad operativa",
  Ambiente: "Ambiente",
  ProcesamientoDepreciacion: "Depreciación",
};

export interface NarrativaAuditoria {
  titulo: string;
  // Sobre qué fue: lo que el empleado reconoce (nombre, código).
  objeto: { tipo: string; nombre: string | null; codigo: string | null; activoId: string | null };
  resumen: string[];
  detalles: { label: string; value: string }[];
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n.toLocaleString("es-PE")} ${n === 1 ? singular : pluralForm}`;
}

const ORIGEN_LABELS: Record<string, string> = {
  excel: "Importación de Excel",
  pdf: "Factura en PDF (importación)",
};

// Etiqueta legible de cada clave que guardan las acciones auditadas.
const CLAVE_LABELS: Record<string, string> = {
  nombreActivo: "Activo",
  activoNombre: "Activo",
  codigoPatrimonial: "Código patrimonial",
  tipo: "Tipo de activo",
  sede: "Sede",
  unidadOperativa: "Unidad operativa",
  responsable: "Responsable",
  responsableAnterior: "Responsable anterior",
  nombre: "Nombre",
  email: "Correo",
  rol: "Rol",
  estado: "Estado de la cuenta",
  cargo: "Cargo",
  documento: "Documento de identidad",
  region: "Región",
  tipoDocumento: "Tipo de documento",
  nombreOriginal: "Archivo",
  origen: "Origen",
  periodo: "Procesado hasta",
  importeTotal: "Importe depreciado",
  periodosRegistrados: "Periodos registrados",
  activosProcesados: "Activos procesados",
  yaProcesados: "Activos ya al día",
  omitidos: "Activos omitidos",
  conErrores: "Activos con errores",
};

// Claves internas que no le dicen nada al empleado (ids) o que ya están en
// el título.
const CLAVES_OCULTAS = new Set(["activoId", "motivo"]);

function valorLegible(clave: string, valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (clave === "rol" && typeof valor === "string") return ROL_USUARIO_LABELS[valor] ?? valor;
  if (clave === "estado" && typeof valor === "boolean") return valor ? "Activa" : "Desactivada";
  if (clave === "tipoDocumento" && typeof valor === "string") return TIPO_DOCUMENTO_LABELS[valor] ?? valor;
  if (clave === "origen" && typeof valor === "string") return ORIGEN_LABELS[valor] ?? valor;
  if (clave === "importeTotal") return formatSoles(parseCentavos(str(valor)) ?? 0);
  if (typeof valor === "number") return valor.toLocaleString("es-PE");
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "string") return valor;
  return JSON.stringify(valor);
}

export function narrarAuditoria(entidad: string, accion: string, detalleRaw: unknown, entidadId: string): NarrativaAuditoria {
  const d = detalleRaw && typeof detalleRaw === "object" ? (detalleRaw as Record<string, unknown>) : {};
  const tipo = ENTIDAD_AUDITORIA_LABELS[entidad] ?? entidad;
  const resumen: string[] = [];
  let titulo: string | null = null;
  let objeto: NarrativaAuditoria["objeto"] = { tipo, nombre: str(d.nombre), codigo: null, activoId: null };

  if (entidad === "Activo") {
    objeto = { tipo, nombre: str(d.nombreActivo), codigo: str(d.codigoPatrimonial), activoId: entidadId };
    const origen = str(d.origen);
    switch (accion) {
      case "DAR_DE_ALTA":
        titulo = origen === "excel" ? "Registró un activo desde Excel" : origen === "pdf" ? "Registró un activo desde una factura" : "Registró un activo nuevo";
        if (str(d.tipo) || str(d.sede)) resumen.push([str(d.tipo), str(d.sede) && `sede ${str(d.sede)}`].filter(Boolean).join(" · "));
        break;
      case "ASIGNAR":
        titulo = str(d.responsable) ? `Asignó un activo a ${str(d.responsable)}` : "Asignó un activo a un responsable";
        break;
      case "TRANSFERIR":
        titulo = "Cambió la sede de un activo";
        resumen.push("El registro no guarda a qué sede; consulta el historial de movimientos del activo.");
        break;
      case "DAR_DE_BAJA":
        titulo = "Dio de baja un activo";
        break;
      case "ELIMINAR":
        titulo = "Eliminó un activo";
        break;
      case "ACTUALIZAR":
        if (d.motivo === "desasignar_responsable") {
          titulo = str(d.responsableAnterior)
            ? `Retiró la asignación de un activo a ${str(d.responsableAnterior)}`
            : "Retiró la asignación de un activo";
        } else {
          titulo = origen === "excel" ? "Actualizó un activo desde Excel" : "Editó los datos de un activo";
          resumen.push("El registro no guarda qué datos cambiaron.");
        }
        break;
    }
  } else if (entidad === "Documento") {
    objeto = {
      tipo,
      nombre: str(d.nombreOriginal),
      codigo: null,
      activoId: str(d.activoId),
    };
    const activo = str(d.activoNombre);
    const contexto = activo ? `${activo}${str(d.codigoPatrimonial) ? ` (${str(d.codigoPatrimonial)})` : ""}` : null;
    if (accion === "ADJUNTAR_DOCUMENTO") titulo = contexto ? `Adjuntó un documento a ${contexto}` : "Adjuntó un documento";
    if (accion === "ELIMINAR_DOCUMENTO") titulo = contexto ? `Quitó un documento de ${contexto}` : "Quitó un documento";
    const tipoDoc = valorLegible("tipoDocumento", d.tipoDocumento);
    if (tipoDoc) resumen.push(tipoDoc);
  } else if (entidad === "Usuario") {
    if (accion === "CREAR") titulo = "Creó una cuenta de usuario";
    if (accion === "ACTUALIZAR") titulo = "Actualizó una cuenta de usuario";
    if (accion === "ELIMINAR") titulo = "Eliminó una cuenta de usuario";
    const partes = [valorLegible("rol", d.rol), valorLegible("estado", d.estado) && `cuenta ${valorLegible("estado", d.estado)!.toLowerCase()}`];
    if (partes.some(Boolean)) resumen.push(partes.filter(Boolean).join(" · "));
  } else if (entidad === "Responsable") {
    if (accion === "CREAR") titulo = "Registró un responsable";
    if (accion === "ACTUALIZAR") titulo = "Actualizó los datos de un responsable";
    if (accion === "ELIMINAR") titulo = "Eliminó un responsable";
    const partes = [str(d.cargo), str(d.sede) && `sede ${str(d.sede)}`];
    if (partes.some(Boolean)) resumen.push(partes.filter(Boolean).join(" · "));
  } else if (entidad === "Sede") {
    if (accion === "CREAR") titulo = "Creó una sede";
    if (accion === "ACTUALIZAR") titulo = "Actualizó una sede";
    if (accion === "ELIMINAR") titulo = "Eliminó una sede";
    if (str(d.region)) resumen.push(`Región ${str(d.region)}`);
  } else if (entidad === "UnidadOperativa") {
    if (accion === "CREAR") titulo = "Creó una unidad operativa";
    if (accion === "ELIMINAR") titulo = "Eliminó una unidad operativa";
    if (str(d.sede)) resumen.push(`En la sede ${str(d.sede)}`);
  } else if (entidad === "Ambiente") {
    if (accion === "CREAR") titulo = "Creó un ambiente";
    if (accion === "ELIMINAR") titulo = "Eliminó un ambiente";
    const lugar = [str(d.sede), str(d.unidadOperativa)].filter(Boolean).join(" › ");
    if (lugar) resumen.push(`En ${lugar}`);
  } else if (entidad === "ProcesamientoDepreciacion" && accion === "PROCESAR_DEPRECIACION") {
    titulo = str(d.periodo) ? `Procesó la depreciación hasta el ${str(d.periodo)}` : "Procesó la depreciación";
    objeto = { tipo, nombre: "Depreciación trimestral", codigo: null, activoId: null };
    const periodos = num(d.periodosRegistrados) ?? 0;
    const activos = num(d.activosProcesados) ?? 0;
    resumen.push(
      `${plural(periodos, "periodo registrado", "periodos registrados")} en ${plural(activos, "activo", "activos")} · ${valorLegible("importeTotal", d.importeTotal) ?? formatSoles(0)}`
    );
  }

  // Combinación que el sistema no produce hoy (o un registro con forma
  // antigua): se dice la acción tal cual, sin inventar el resto.
  if (!titulo) titulo = `${TIPO_ACCION_AUDITORIA_LABELS[accion] ?? accion} (${tipo.toLowerCase()})`;

  // Orden de CLAVE_LABELS (lo importante primero), no el que haya quedado
  // en el JSON guardado; las claves desconocidas van al final.
  const orden = Object.keys(CLAVE_LABELS);
  const posicion = (clave: string) => (orden.includes(clave) ? orden.indexOf(clave) : orden.length);
  const detalles = Object.entries(d)
    .filter(([clave]) => !CLAVES_OCULTAS.has(clave))
    .sort(([a], [b]) => posicion(a) - posicion(b))
    .map(([clave, valor]) => ({ label: CLAVE_LABELS[clave] ?? clave, value: valorLegible(clave, valor) }))
    .filter((fila): fila is { label: string; value: string } => fila.value !== null);

  return { titulo, objeto, resumen, detalles };
}
