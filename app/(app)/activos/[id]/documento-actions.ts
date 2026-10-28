"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { requireSessionUsuario } from "@/lib/auth/session";

// Fase 10 de Activos: eliminar documentos adjuntos a un Activo. La subida
// vive en app/api/activos/[id]/documentos (Fase 63, ver lib/documentos/subir.ts).

export async function eliminarDocumentoAction(documentoId: string): Promise<void> {
  const actor = await requireSessionUsuario();
  const documento = await prisma.$transaction(async (tx) => {
    const updated = await tx.documento.update({
      where: { id: documentoId },
      data: { estado: false },
      include: { activo: { select: { nombreActivo: true, codigoPatrimonial: true } } },
    });
    await registrarAuditoria(
      {
        accion: "ELIMINAR_DOCUMENTO",
        entidad: "Documento",
        entidadId: documentoId,
        detalle: {
          activoId: updated.activoId,
          activoNombre: updated.activo.nombreActivo,
          codigoPatrimonial: updated.activo.codigoPatrimonial,
          nombreOriginal: updated.nombreOriginal,
        },
        usuarioId: actor.id,
      },
      tx
    );
    return updated;
  });

  revalidatePath(`/activos/${documento.activoId}`);
  revalidatePath(`/activos/${documento.activoId}/ficha`);
}
