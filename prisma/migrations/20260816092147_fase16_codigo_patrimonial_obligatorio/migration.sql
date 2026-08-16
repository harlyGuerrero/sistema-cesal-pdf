/*
  Warnings:

  - Made the column `codigoPatrimonial` on table `activos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "activos" ALTER COLUMN "codigoPatrimonial" SET NOT NULL;
