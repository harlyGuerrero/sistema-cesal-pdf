import type { RolUsuario } from "@/lib/generated/prisma/client";

// Fase 66: eliminar un activo es corregir un error de registro (alta por
// error, duplicado) — no es el fin de vida del bien, eso es la baja. Por eso
// solo se permite mientras el activo no tenga nada que trazar: ni origen en
// una importación, ni depreciación, ni documentos vigentes, ni movimientos
// además del alta. La misma regla decide en el servidor (deleteActivoAction)
// y en la ficha si se muestra el botón.
export interface ActivoEliminable {
  importItemId: string | null;
  documentosVigentes: number;
  depreciaciones: number;
  movimientosPosterioresAlAlta: number;
}

export function puedeEliminarActivos(rol: RolUsuario | null | undefined): boolean {
  return rol === "SUPER_ADMIN";
}

export function motivoNoEliminable(activo: ActivoEliminable): string | null {
  if (activo.depreciaciones > 0) return "tiene depreciación registrada (mantiene el historial contable)";
  if (activo.importItemId) return "proviene de una importación (mantiene trazabilidad)";
  if (activo.documentosVigentes > 0) return "tiene documentos adjuntos";
  if (activo.movimientosPosterioresAlAlta > 0) return "ya tiene movimientos registrados además del alta";
  return null;
}

// Conteos de Prisma que alimentan motivoNoEliminable — compartidos entre la
// acción y la ficha para que ambas cuenten lo mismo.
export const CONTEO_ELIMINACION = {
  documentos: { where: { estado: true } },
  depreciaciones: true,
  movimientos: { where: { tipo: { not: "ALTA" as const } } },
};

export function aActivoEliminable(activo: {
  importItemId: string | null;
  _count: { documentos: number; depreciaciones: number; movimientos: number };
}): ActivoEliminable {
  return {
    importItemId: activo.importItemId,
    documentosVigentes: activo._count.documentos,
    depreciaciones: activo._count.depreciaciones,
    movimientosPosterioresAlAlta: activo._count.movimientos,
  };
}
