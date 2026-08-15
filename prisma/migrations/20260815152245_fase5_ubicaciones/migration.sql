/*
  Warnings:

  - You are about to drop the column `city` on the `sedes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sedes" DROP COLUMN "city";

-- CreateTable
CREATE TABLE "unidades_operativas" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_operativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambientes" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "unidadOperativaId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unidades_operativas_sedeId_idx" ON "unidades_operativas"("sedeId");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_operativas_sedeId_name_key" ON "unidades_operativas"("sedeId", "name");

-- CreateIndex
CREATE INDEX "ambientes_sedeId_idx" ON "ambientes"("sedeId");

-- CreateIndex
CREATE INDEX "ambientes_unidadOperativaId_idx" ON "ambientes"("unidadOperativaId");

-- AddForeignKey
ALTER TABLE "unidades_operativas" ADD CONSTRAINT "unidades_operativas_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambientes" ADD CONSTRAINT "ambientes_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambientes" ADD CONSTRAINT "ambientes_unidadOperativaId_fkey" FOREIGN KEY ("unidadOperativaId") REFERENCES "unidades_operativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
