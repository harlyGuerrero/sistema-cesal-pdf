-- DropForeignKey
ALTER TABLE "activos" DROP CONSTRAINT "activos_sedeId_fkey";

-- DropForeignKey
ALTER TABLE "activos" DROP CONSTRAINT "activos_subcategoriaId_fkey";

-- AlterTable
ALTER TABLE "activos" ALTER COLUMN "sedeId" DROP NOT NULL,
ALTER COLUMN "subcategoriaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "subcategorias_activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
