-- Fase 55 (datos): nombres oficiales de los 7 tipos de activo de CESAL.
-- Se actualiza por "code" conservando cada "id", así Activos, ImportItems y
-- Categorías siguen apuntando a la misma fila. Idempotente: volver a
-- ejecutarlo no crea duplicados ni cambia nada.

UPDATE "categories" SET "name" = 'Edificaciones', "updatedAt" = CURRENT_TIMESTAMP
  WHERE "code" = 'EDIFICACIONES' AND "name" <> 'Edificaciones';
UPDATE "categories" SET "name" = 'Vehículos y medios de transporte', "updatedAt" = CURRENT_TIMESTAMP
  WHERE "code" = 'VEHICULOS_Y_MEDIOS_DE_TRANSPORTE' AND "name" <> 'Vehículos y medios de transporte';
UPDATE "categories" SET "name" = 'Equipos informáticos', "updatedAt" = CURRENT_TIMESTAMP
  WHERE "code" = 'EQUIPOS_INFORMATICOS' AND "name" <> 'Equipos informáticos';
UPDATE "categories" SET "name" = 'Equipos de oficina', "updatedAt" = CURRENT_TIMESTAMP
  WHERE "code" = 'EQUIPOS_DE_OFICINA' AND "name" <> 'Equipos de oficina';
UPDATE "categories" SET "name" = 'Maquinaria y equipos', "updatedAt" = CURRENT_TIMESTAMP
  WHERE "code" = 'MAQUINARIA_Y_EQUIPOS' AND "name" <> 'Maquinaria y equipos';
UPDATE "categories" SET "name" = 'Mobiliario y enseres', "updatedAt" = CURRENT_TIMESTAMP
  WHERE "code" = 'MOBILIARIO_Y_ENSERES' AND "name" <> 'Mobiliario y enseres';

INSERT INTO "categories" ("id", "code", "name", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'ACTIVOS_INTANGIBLES_INFORMATICOS', 'Activos intangibles informáticos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- "Terrenos" y "Otros inmuebles" colgaban de Bienes Inmuebles, pero no son
-- edificaciones y el catálogo oficial no tiene un tipo para ellos (decisión
-- del usuario: eliminarlas). Solo se borran si siguen vacías — si alguien
-- les agregó subcategorías mientras tanto, quedan intactas.
DELETE FROM "categorias_activo" c
USING "categories" t
WHERE c."tipoActivoId" = t."id"
  AND t."code" = 'EDIFICACIONES'
  AND c."slug" IN ('terrenos', 'otros-inmuebles')
  AND NOT EXISTS (SELECT 1 FROM "subcategorias_activo" s WHERE s."categoriaId" = c."id");
