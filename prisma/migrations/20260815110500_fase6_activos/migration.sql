-- AlterTable
ALTER TABLE "activos" ADD COLUMN     "ambienteId" TEXT,
ADD COLUMN     "proveedorId" TEXT,
ADD COLUMN     "sedeId" TEXT NOT NULL,
ADD COLUMN     "subcategoriaId" TEXT NOT NULL,
ADD COLUMN     "unidadOperativaId" TEXT;

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "documento" TEXT,
    "contacto" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_razonSocial_key" ON "proveedores"("razonSocial");

-- CreateIndex
CREATE INDEX "activos_subcategoriaId_idx" ON "activos"("subcategoriaId");

-- CreateIndex
CREATE INDEX "activos_sedeId_idx" ON "activos"("sedeId");

-- CreateIndex
CREATE INDEX "activos_unidadOperativaId_idx" ON "activos"("unidadOperativaId");

-- CreateIndex
CREATE INDEX "activos_ambienteId_idx" ON "activos"("ambienteId");

-- CreateIndex
CREATE INDEX "activos_proveedorId_idx" ON "activos"("proveedorId");

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "subcategorias_activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_unidadOperativaId_fkey" FOREIGN KEY ("unidadOperativaId") REFERENCES "unidades_operativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_ambienteId_fkey" FOREIGN KEY ("ambienteId") REFERENCES "ambientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
