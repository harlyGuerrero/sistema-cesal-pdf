-- Fase 55: tipos de activo oficiales de CESAL (7). Migración escrita a mano:
-- el diff automático de Prisma recrearía el enum (DROP + CREATE), lo que
-- obligaría a reescribir cada columna que lo usa. RENAME VALUE conserva
-- todas las filas tal cual (categories.code, codigo_patrimonial_contadores).
--
-- Reversión manual (si hiciera falta), en este orden:
--   ALTER TYPE "TipoActivoCode" RENAME VALUE 'EDIFICACIONES' TO 'BIENES_INMUEBLES';
--   ALTER TYPE "TipoActivoCode" RENAME VALUE 'VEHICULOS_Y_MEDIOS_DE_TRANSPORTE' TO 'BIENES_VEHICULARES';
--   ALTER TYPE "TipoActivoCode" RENAME VALUE 'MAQUINARIA_Y_EQUIPOS' TO 'EQUIPOS_DE_MAQUINARIA';
--   ALTER TYPE "TipoActivoCode" RENAME VALUE 'MOBILIARIO_Y_ENSERES' TO 'MUEBLES_DE_OFICINA';
-- PostgreSQL no permite quitar un valor de un enum: ACTIVOS_INTANGIBLES_INFORMATICOS
-- quedaría en el tipo aunque se borre su fila de "categories".

ALTER TYPE "TipoActivoCode" RENAME VALUE 'BIENES_INMUEBLES' TO 'EDIFICACIONES';
ALTER TYPE "TipoActivoCode" RENAME VALUE 'BIENES_VEHICULARES' TO 'VEHICULOS_Y_MEDIOS_DE_TRANSPORTE';
ALTER TYPE "TipoActivoCode" RENAME VALUE 'EQUIPOS_DE_MAQUINARIA' TO 'MAQUINARIA_Y_EQUIPOS';
ALTER TYPE "TipoActivoCode" RENAME VALUE 'MUEBLES_DE_OFICINA' TO 'MOBILIARIO_Y_ENSERES';

-- El valor nuevo va en esta migración y su fila en la siguiente: un valor
-- agregado con ADD VALUE no puede usarse dentro de la misma transacción.
ALTER TYPE "TipoActivoCode" ADD VALUE IF NOT EXISTS 'ACTIVOS_INTANGIBLES_INFORMATICOS';
