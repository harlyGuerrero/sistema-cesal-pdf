-- AlterEnum
ALTER TYPE "TipoAccionAuditoria" ADD VALUE 'PROCESAR_DEPRECIACION';

-- CreateTable
CREATE TABLE "tasas_depreciacion" (
    "id" TEXT NOT NULL,
    "tipoActivoId" TEXT NOT NULL,
    "tasaAnual" DECIMAL(7,4) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasas_depreciacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciacion_periodos" (
    "id" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "costoBase" DECIMAL(14,2) NOT NULL,
    "tasaTrimestral" DECIMAL(7,4) NOT NULL,
    "importeDepreciado" DECIMAL(14,2) NOT NULL,
    "depreciacionAcumulada" DECIMAL(14,2) NOT NULL,
    "valorNeto" DECIMAL(14,2) NOT NULL,
    "procesamientoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depreciacion_periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procesamientos_depreciacion" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "usuarioId" TEXT,
    "activosProcesados" INTEGER NOT NULL,
    "periodosRegistrados" INTEGER NOT NULL,
    "yaProcesados" INTEGER NOT NULL,
    "omitidos" INTEGER NOT NULL,
    "conErrores" INTEGER NOT NULL,
    "importeTotal" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procesamientos_depreciacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tasas_depreciacion_tipoActivoId_key" ON "tasas_depreciacion"("tipoActivoId");

-- CreateIndex
CREATE INDEX "depreciacion_periodos_anio_trimestre_idx" ON "depreciacion_periodos"("anio", "trimestre");

-- CreateIndex
CREATE INDEX "depreciacion_periodos_procesamientoId_idx" ON "depreciacion_periodos"("procesamientoId");

-- CreateIndex
CREATE UNIQUE INDEX "depreciacion_periodos_activoId_anio_trimestre_key" ON "depreciacion_periodos"("activoId", "anio", "trimestre");

-- CreateIndex
CREATE INDEX "procesamientos_depreciacion_anio_trimestre_idx" ON "procesamientos_depreciacion"("anio", "trimestre");

-- CreateIndex
CREATE INDEX "procesamientos_depreciacion_usuarioId_idx" ON "procesamientos_depreciacion"("usuarioId");

-- AddForeignKey
ALTER TABLE "tasas_depreciacion" ADD CONSTRAINT "tasas_depreciacion_tipoActivoId_fkey" FOREIGN KEY ("tipoActivoId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciacion_periodos" ADD CONSTRAINT "depreciacion_periodos_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciacion_periodos" ADD CONSTRAINT "depreciacion_periodos_procesamientoId_fkey" FOREIGN KEY ("procesamientoId") REFERENCES "procesamientos_depreciacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procesamientos_depreciacion" ADD CONSTRAINT "procesamientos_depreciacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fase 58: reglas de integridad que Prisma no expresa. Un periodo es un
-- trimestre calendario (1..4), nunca deprecia montos negativos, el acumulado
-- no supera el costo base y el valor neto es exactamente costo - acumulado
-- (valor residual S/ 0,00, nunca negativo).
ALTER TABLE "depreciacion_periodos"
  ADD CONSTRAINT "depreciacion_periodos_trimestre_check" CHECK ("trimestre" BETWEEN 1 AND 4),
  ADD CONSTRAINT "depreciacion_periodos_costo_check" CHECK ("costoBase" > 0),
  ADD CONSTRAINT "depreciacion_periodos_tasa_check" CHECK ("tasaTrimestral" > 0 AND "tasaTrimestral" <= 100),
  ADD CONSTRAINT "depreciacion_periodos_importe_check" CHECK ("importeDepreciado" > 0),
  ADD CONSTRAINT "depreciacion_periodos_acumulado_check" CHECK ("depreciacionAcumulada" > 0 AND "depreciacionAcumulada" <= "costoBase"),
  ADD CONSTRAINT "depreciacion_periodos_valor_neto_check" CHECK ("valorNeto" >= 0 AND "valorNeto" = "costoBase" - "depreciacionAcumulada");

ALTER TABLE "procesamientos_depreciacion"
  ADD CONSTRAINT "procesamientos_depreciacion_trimestre_check" CHECK ("trimestre" BETWEEN 1 AND 4);

ALTER TABLE "tasas_depreciacion"
  ADD CONSTRAINT "tasas_depreciacion_tasa_anual_check" CHECK ("tasaAnual" > 0 AND "tasaAnual" <= 100);

-- Tasas oficiales de CESAL (mismos valores que TASAS_OFICIALES_CESAL en
-- lib/depreciacion/tasas.ts, que también usa prisma/seed.ts para una base
-- nueva). Idempotente: no pisa una tasa ya cargada.
INSERT INTO "tasas_depreciacion" ("id", "tipoActivoId", "tasaAnual", "activa", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c."id", t."tasa", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "categories" c
JOIN (VALUES
  ('EDIFICACIONES', 5.0000),
  ('VEHICULOS_Y_MEDIOS_DE_TRANSPORTE', 10.0000),
  ('EQUIPOS_INFORMATICOS', 25.0000),
  ('EQUIPOS_DE_OFICINA', 10.0000),
  ('ACTIVOS_INTANGIBLES_INFORMATICOS', 25.0000),
  ('MAQUINARIA_Y_EQUIPOS', 10.0000),
  ('MOBILIARIO_Y_ENSERES', 10.0000)
) AS t("code", "tasa") ON c."code"::text = t."code"
ON CONFLICT ("tipoActivoId") DO NOTHING;
