-- CreateTable
CREATE TABLE "activo_especificacion_valores" (
    "id" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "campoId" TEXT NOT NULL,
    "valorTexto" TEXT,
    "valorNumero" DECIMAL(18,4),
    "valorFecha" TIMESTAMP(3),
    "valorBooleano" BOOLEAN,
    "valorCatalogoValorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activo_especificacion_valores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activo_especificacion_valores_campoId_idx" ON "activo_especificacion_valores"("campoId");

-- CreateIndex
CREATE INDEX "activo_especificacion_valores_valorCatalogoValorId_idx" ON "activo_especificacion_valores"("valorCatalogoValorId");

-- CreateIndex
CREATE UNIQUE INDEX "activo_especificacion_valores_activoId_campoId_key" ON "activo_especificacion_valores"("activoId", "campoId");

-- CreateIndex
CREATE UNIQUE INDEX "campos_especificacion_subcategoriaId_nombre_key" ON "campos_especificacion"("subcategoriaId", "nombre");

-- AddForeignKey
ALTER TABLE "activo_especificacion_valores" ADD CONSTRAINT "activo_especificacion_valores_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activo_especificacion_valores" ADD CONSTRAINT "activo_especificacion_valores_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "campos_especificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activo_especificacion_valores" ADD CONSTRAINT "activo_especificacion_valores_valorCatalogoValorId_fkey" FOREIGN KEY ("valorCatalogoValorId") REFERENCES "catalogo_valores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
