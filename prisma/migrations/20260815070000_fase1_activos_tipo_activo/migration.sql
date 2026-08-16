/*
  Warnings:

  - You are about to drop the column `categoryId` on the `import_items` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `import_items` table. All the data in the column will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `code` on the `categories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TipoActivoCode" AS ENUM ('EQUIPOS_INFORMATICOS', 'EQUIPOS_DE_OFICINA', 'MUEBLES_DE_OFICINA', 'BIENES_VEHICULARES', 'EQUIPOS_DE_MAQUINARIA', 'BIENES_INMUEBLES');

-- CreateEnum
CREATE TYPE "EstadoPatrimonial" AS ENUM ('DISPONIBLE', 'ASIGNADO', 'MANTENIMIENTO', 'BAJA');

-- CreateEnum
CREATE TYPE "CondicionFisica" AS ENUM ('NUEVO', 'BUENO', 'REGULAR', 'MALO', 'DETERIORADO');

-- CreateEnum
CREATE TYPE "TipoDato" AS ENUM ('TEXTO', 'NUMERO_ENTERO', 'NUMERO_DECIMAL', 'FECHA', 'BOOLEANO', 'SELECCION', 'CATALOGO', 'URL');

-- DropForeignKey
ALTER TABLE "import_items" DROP CONSTRAINT "import_items_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "import_items" DROP CONSTRAINT "import_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_categoryId_fkey";

-- DropIndex
DROP INDEX "import_items_categoryId_idx";

-- DropIndex
DROP INDEX "import_items_productId_idx";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "code",
ADD COLUMN     "code" "TipoActivoCode" NOT NULL;

-- AlterTable
ALTER TABLE "import_items" DROP COLUMN "categoryId",
DROP COLUMN "productId",
ADD COLUMN     "tipoActivoId" TEXT;

-- DropTable
DROP TABLE "products";

-- DropEnum
DROP TYPE "CategoryCode";

-- CreateTable
CREATE TABLE "categorias_activo" (
    "id" TEXT NOT NULL,
    "tipoActivoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_activo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategorias_activo" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategorias_activo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_valores" (
    "id" TEXT NOT NULL,
    "catalogoId" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_valores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campos_especificacion" (
    "id" TEXT NOT NULL,
    "subcategoriaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "tipoDato" "TipoDato" NOT NULL,
    "unidad" TEXT,
    "catalogoId" TEXT,
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campos_especificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activos" (
    "id" TEXT NOT NULL,
    "codigoPatrimonial" TEXT,
    "nombreActivo" TEXT NOT NULL,
    "nombreNormalizado" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipoActivoId" TEXT NOT NULL,
    "fechaAdquisicion" TIMESTAMP(3),
    "numeroFactura" TEXT,
    "codigoProyecto" TEXT,
    "costoAdquisicion" DECIMAL(14,2),
    "valorContable" DECIMAL(14,2),
    "valorActual" DECIMAL(14,2),
    "estadoPatrimonial" "EstadoPatrimonial" NOT NULL DEFAULT 'DISPONIBLE',
    "condicionFisica" "CondicionFisica",
    "observaciones" TEXT,
    "importItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categorias_activo_tipoActivoId_idx" ON "categorias_activo"("tipoActivoId");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_activo_tipoActivoId_slug_key" ON "categorias_activo"("tipoActivoId", "slug");

-- CreateIndex
CREATE INDEX "subcategorias_activo_categoriaId_idx" ON "subcategorias_activo"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "subcategorias_activo_categoriaId_slug_key" ON "subcategorias_activo"("categoriaId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "catalogos_codigo_key" ON "catalogos"("codigo");

-- CreateIndex
CREATE INDEX "catalogo_valores_catalogoId_idx" ON "catalogo_valores"("catalogoId");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_valores_catalogoId_valor_key" ON "catalogo_valores"("catalogoId", "valor");

-- CreateIndex
CREATE INDEX "campos_especificacion_subcategoriaId_idx" ON "campos_especificacion"("subcategoriaId");

-- CreateIndex
CREATE INDEX "campos_especificacion_catalogoId_idx" ON "campos_especificacion"("catalogoId");

-- CreateIndex
CREATE UNIQUE INDEX "activos_codigoPatrimonial_key" ON "activos"("codigoPatrimonial");

-- CreateIndex
CREATE INDEX "activos_nombreNormalizado_idx" ON "activos"("nombreNormalizado");

-- CreateIndex
CREATE INDEX "activos_tipoActivoId_idx" ON "activos"("tipoActivoId");

-- CreateIndex
CREATE INDEX "activos_importItemId_idx" ON "activos"("importItemId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE INDEX "import_items_tipoActivoId_idx" ON "import_items"("tipoActivoId");

-- AddForeignKey
ALTER TABLE "categorias_activo" ADD CONSTRAINT "categorias_activo_tipoActivoId_fkey" FOREIGN KEY ("tipoActivoId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategorias_activo" ADD CONSTRAINT "subcategorias_activo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_valores" ADD CONSTRAINT "catalogo_valores_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "catalogos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campos_especificacion" ADD CONSTRAINT "campos_especificacion_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "subcategorias_activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campos_especificacion" ADD CONSTRAINT "campos_especificacion_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "catalogos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_tipoActivoId_fkey" FOREIGN KEY ("tipoActivoId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_importItemId_fkey" FOREIGN KEY ("importItemId") REFERENCES "import_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_tipoActivoId_fkey" FOREIGN KEY ("tipoActivoId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
