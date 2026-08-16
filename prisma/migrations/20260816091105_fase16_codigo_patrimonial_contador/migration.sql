-- CreateTable
CREATE TABLE "codigo_patrimonial_contadores" (
    "id" TEXT NOT NULL,
    "tipoActivoCode" "TipoActivoCode" NOT NULL,
    "anio" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "codigo_patrimonial_contadores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "codigo_patrimonial_contadores_tipoActivoCode_anio_key" ON "codigo_patrimonial_contadores"("tipoActivoCode", "anio");
