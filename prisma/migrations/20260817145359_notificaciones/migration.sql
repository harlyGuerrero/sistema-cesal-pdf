-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('ASIGNACION', 'REASIGNACION', 'CAMBIO_RESPONSABLE', 'CAMBIO_UBICACION', 'MANTENIMIENTO', 'BAJA', 'IMPORTACION_COMPLETADA', 'IMPORTACION_CON_ERRORES', 'DOCUMENTO_AGREGADO', 'SISTEMA');

-- CreateEnum
CREATE TYPE "PrioridadNotificacion" AS ENUM ('NORMAL', 'ALTA', 'INFORMATIVA');

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "prioridad" "PrioridadNotificacion" NOT NULL DEFAULT 'NORMAL',
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "entidad" TEXT,
    "entidadId" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "leidaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificaciones_usuarioId_leida_idx" ON "notificaciones"("usuarioId", "leida");

-- CreateIndex
CREATE INDEX "notificaciones_usuarioId_createdAt_idx" ON "notificaciones"("usuarioId", "createdAt");

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
