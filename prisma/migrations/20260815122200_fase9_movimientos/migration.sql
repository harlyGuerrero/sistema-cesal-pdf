-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ALTA', 'ASIGNACION', 'REASIGNACION', 'CAMBIO_RESPONSABLE', 'TRANSFERENCIA', 'CAMBIO_UBICACION', 'MANTENIMIENTO', 'RETORNO_MANTENIMIENTO', 'BAJA', 'REACTIVACION');

-- CreateTable
CREATE TABLE "movimientos" (
    "id" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "responsableAnteriorId" TEXT,
    "responsableNuevoId" TEXT,
    "sedeAnteriorId" TEXT,
    "sedeNuevaId" TEXT,
    "unidadOperativaAnteriorId" TEXT,
    "unidadOperativaNuevaId" TEXT,
    "ambienteAnteriorId" TEXT,
    "ambienteNuevoId" TEXT,
    "estadoAnterior" "EstadoPatrimonial",
    "estadoNuevo" "EstadoPatrimonial",
    "motivo" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimientos_activoId_idx" ON "movimientos"("activoId");

-- CreateIndex
CREATE INDEX "movimientos_tipo_idx" ON "movimientos"("tipo");

-- CreateIndex
CREATE INDEX "movimientos_usuarioId_idx" ON "movimientos"("usuarioId");

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_responsableAnteriorId_fkey" FOREIGN KEY ("responsableAnteriorId") REFERENCES "responsables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_responsableNuevoId_fkey" FOREIGN KEY ("responsableNuevoId") REFERENCES "responsables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_sedeAnteriorId_fkey" FOREIGN KEY ("sedeAnteriorId") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_sedeNuevaId_fkey" FOREIGN KEY ("sedeNuevaId") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_unidadOperativaAnteriorId_fkey" FOREIGN KEY ("unidadOperativaAnteriorId") REFERENCES "unidades_operativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_unidadOperativaNuevaId_fkey" FOREIGN KEY ("unidadOperativaNuevaId") REFERENCES "unidades_operativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_ambienteAnteriorId_fkey" FOREIGN KEY ("ambienteAnteriorId") REFERENCES "ambientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_ambienteNuevoId_fkey" FOREIGN KEY ("ambienteNuevoId") REFERENCES "ambientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
