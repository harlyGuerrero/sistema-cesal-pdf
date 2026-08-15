-- CreateEnum
CREATE TYPE "Region" AS ENUM ('COSTA', 'SIERRA', 'SELVA');

-- CreateTable
CREATE TABLE "sedes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sedes_name_key" ON "sedes"("name");

-- CreateIndex
CREATE INDEX "sedes_region_idx" ON "sedes"("region");
