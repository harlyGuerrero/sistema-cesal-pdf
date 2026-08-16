-- Fase 35: separa el campo único "nombre" de Usuario y Responsable en
-- "nombres" + "apellidos". Los registros existentes migran su valor actual
-- completo a "nombres", con "apellidos" vacío (decisión del usuario:
-- corregirlos a mano después desde la UI, en vez de partir el texto por el
-- primer espacio, que rompería nombres compuestos).

-- Usuario
ALTER TABLE "usuarios" ADD COLUMN "nombres" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "apellidos" TEXT NOT NULL DEFAULT '';
UPDATE "usuarios" SET "nombres" = "nombre";
ALTER TABLE "usuarios" ALTER COLUMN "nombres" SET NOT NULL;
ALTER TABLE "usuarios" DROP COLUMN "nombre";

-- Responsable
ALTER TABLE "responsables" ADD COLUMN "nombres" TEXT;
ALTER TABLE "responsables" ADD COLUMN "apellidos" TEXT NOT NULL DEFAULT '';
UPDATE "responsables" SET "nombres" = "nombre";
ALTER TABLE "responsables" ALTER COLUMN "nombres" SET NOT NULL;
ALTER TABLE "responsables" DROP COLUMN "nombre";
