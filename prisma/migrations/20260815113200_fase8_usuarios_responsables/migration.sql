-- AlterTable
ALTER TABLE "activos" ADD COLUMN     "responsableActualId" TEXT;

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsables" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "cargo" TEXT,
    "sedeId" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "responsables_sedeId_idx" ON "responsables"("sedeId");

-- CreateIndex
CREATE INDEX "activos_responsableActualId_idx" ON "activos"("responsableActualId");

-- AddForeignKey
ALTER TABLE "responsables" ADD CONSTRAINT "responsables_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activos" ADD CONSTRAINT "activos_responsableActualId_fkey" FOREIGN KEY ("responsableActualId") REFERENCES "responsables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
