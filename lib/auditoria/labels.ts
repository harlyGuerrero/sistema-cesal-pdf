// Fase 11: etiquetas de TipoAccionAuditoria y la lista de entidades que hoy
// escriben auditoría (ver registrarAuditoria en actions.ts de Activo,
// Documento y Responsable) — no es un enum en la base (entidad es texto
// libre, referencia lógica), así que esta lista documenta lo que el sistema
// realmente produce, no una posibilidad abierta.

export const TIPO_ACCION_AUDITORIA_LABELS: Record<string, string> = {
  CREAR: "Crear",
  ACTUALIZAR: "Actualizar",
  ELIMINAR: "Eliminar",
  DAR_DE_ALTA: "Dar de alta",
  DAR_DE_BAJA: "Dar de baja",
  ASIGNAR: "Asignar",
  TRANSFERIR: "Transferir",
  ADJUNTAR_DOCUMENTO: "Adjuntar documento",
  ELIMINAR_DOCUMENTO: "Eliminar documento",
};

export const TIPO_ACCION_AUDITORIA_OPTIONS = Object.entries(TIPO_ACCION_AUDITORIA_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const ENTIDADES_AUDITADAS = ["Activo", "Documento", "Responsable"] as const;
