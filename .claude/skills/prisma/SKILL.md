---
name: prisma
description: Convenciones de schema Prisma 7 para este proyecto — modelo Product/Import/ImportItem/ProcessingAttempt. Usar al escribir o modificar schema.prisma.
---

# Prisma

Implementado en Fase 2. `prisma/schema.prisma` es la fuente de verdad del schema.

## Modelo a respetar

`Product` no tiene `importId` obligatorio. La relación hacia importaciones es `Product ← ImportItem ← Import` (ver `ARCHITECTURE.md` sección 6 y skill `import-workflow`). `Category` es una tabla propia (no un enum plano) referenciada por `categoryId` desde `Product` e `ImportItem`; el enum `CategoryCode` cierra los valores válidos y se siembra vía `prisma/seed.ts` (exactamente 6 filas, nunca `OTROS`).

## Enums (definidos en schema.prisma)

- `ImportStatus`: `UPLOADED`, `PROCESSING`, `READY_FOR_REVIEW`, `COMPLETED`, `FAILED`.
- `Relevance`: `PRODUCT`, `CONSUMABLE`, `SERVICE`, `OTHER`.
- `CategoryCode`: `EQUIPOS_INFORMATICOS`, `EQUIPOS_DE_OFICINA`, `MUEBLES_DE_OFICINA`, `BIENES_VEHICULARES`, `EQUIPOS_DE_MAQUINARIA`, `BIENES_INMUEBLES`. Cerrado, sin `OTROS`.
- `ImportItemStatus`: `REVIEW_REQUIRED`, `CONFIRMED`, `REJECTED`, `IGNORED` (`IGNORED` = relevance != PRODUCT, auto).
- `ClassificationMethod`: `RULE`, `OLLAMA`, `MANUAL`.
- `ProcessingEngine`: `DOCLING`, `OCR`, `GLM_OCR`, `GRANITE_DOCLING`, `OLLAMA`.
- `ProcessingAttemptStatus`: `RUNNING`, `COMPLETED`, `FAILED`.

## Prisma 7: generator y driver adapter

El generator usado es `prisma-client` (no `prisma-client-js`), con `output = "../lib/generated/prisma"` — carpeta generada, en `.gitignore`, nunca editada a mano. El import correcto es desde `lib/generated/prisma/client` (no hay barrel `index`).

Prisma 7 con este generator **requiere un driver adapter explícito** — `new PrismaClient()` sin adapter lanza error en runtime. Usar siempre `@prisma/adapter-pg` (`PrismaPg`) con `connectionString: process.env.DATABASE_URL`. El singleton de la app vive en `lib/db.ts` (patrón `globalThis` para no agotar conexiones con el hot-reload de Next.js) — importar `prisma` desde ahí en vez de instanciar `PrismaClient` en cada archivo.

La config del CLI (datasource URL, path de migraciones, comando de seed) vive en `prisma.config.ts`, no en `schema.prisma` ni en `package.json`.

## ImportItem: relevance y category son independientes

`ImportItem` **no** tiene un único par `classificationMethod`/`confidence` — tiene `relevanceMethod`/`relevanceConfidence` y `categoryMethod`/`categoryConfidence` por separado (migración `split-classification-fields`, Fase 8). Motivo: relevancia (Fase 6) y categoría (Fase 7) son clasificaciones independientes, cada una puede venir de `RULE` u `OLLAMA` con su propia confianza — un solo campo perdía cuál de las dos usó el fallback semántico y con qué confianza. Si se necesita ampliar esto a más etapas clasificadas, seguir el mismo patrón (prefijo por etapa), no volver a un par genérico.

## Migraciones

Toda migración se genera con el CLI de Prisma (`prisma migrate dev`), nunca se edita SQL de migración generado a mano salvo corrección de un problema puntual y documentado.

Detalle de índices/constraints/transacciones: ver skill `postgresql`.
