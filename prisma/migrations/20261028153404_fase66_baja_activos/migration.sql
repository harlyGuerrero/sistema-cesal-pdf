-- CreateEnum
CREATE TYPE "MotivoBaja" AS ENUM ('OBSOLESCENCIA', 'DETERIORO_IRREPARABLE', 'ROBO_O_PERDIDA', 'SINIESTRO', 'DONACION', 'VENTA', 'TRANSFERENCIA_EXTERNA', 'OTRO');

-- AlterTable
ALTER TABLE "activos" ADD COLUMN     "fechaBaja" DATE,
ADD COLUMN     "motivoBaja" "MotivoBaja",
ADD COLUMN     "observacionesBaja" TEXT;
