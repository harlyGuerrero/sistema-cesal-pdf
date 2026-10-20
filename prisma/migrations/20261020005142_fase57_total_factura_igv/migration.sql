-- CreateEnum
CREATE TYPE "IgvTratamiento" AS ENUM ('SIN_IGV', 'CON_IGV', 'EXONERADO');

-- AlterTable
ALTER TABLE "imports" ADD COLUMN     "igvTratamiento" "IgvTratamiento",
ADD COLUMN     "totalFactura" DECIMAL(14,2);
