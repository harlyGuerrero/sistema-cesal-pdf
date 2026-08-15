-- CreateEnum
CREATE TYPE "TipoAccionAuditoria" AS ENUM ('CREAR', 'ACTUALIZAR', 'ELIMINAR', 'DAR_DE_ALTA', 'DAR_DE_BAJA', 'ASIGNAR', 'TRANSFERIR', 'ADJUNTAR_DOCUMENTO', 'ELIMINAR_DOCUMENTO');

-- CreateTable
CREATE TABLE "auditoria_logs" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" "TipoAccionAuditoria" NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "detalle" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_logs_entidad_entidadId_idx" ON "auditoria_logs"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "auditoria_logs_usuarioId_idx" ON "auditoria_logs"("usuarioId");

-- CreateIndex
CREATE INDEX "auditoria_logs_accion_idx" ON "auditoria_logs"("accion");

-- AddForeignKey
ALTER TABLE "auditoria_logs" ADD CONSTRAINT "auditoria_logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
