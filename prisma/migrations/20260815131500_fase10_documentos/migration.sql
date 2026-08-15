-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('FACTURA', 'COMPROBANTE', 'ACTA_ENTREGA', 'ACTA_ASIGNACION', 'ACTA_TRANSFERENCIA', 'DOCUMENTO_BAJA', 'GARANTIA', 'FICHA_TECNICA', 'CERTIFICADO', 'FOTOGRAFIA', 'OTRO');

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "descripcion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "usuarioCargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentos_activoId_idx" ON "documentos"("activoId");

-- CreateIndex
CREATE INDEX "documentos_tipoDocumento_idx" ON "documentos"("tipoDocumento");

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_usuarioCargaId_fkey" FOREIGN KEY ("usuarioCargaId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
