---
name: prisma
description: Convenciones de schema Prisma 7 para este proyecto — modelo Activo/TipoActivo/Import/ImportItem/ProcessingAttempt, y el módulo patrimonial de Activos (taxonomía, ubicaciones, campos dinámicos). Usar al escribir o modificar schema.prisma.
---

# Prisma

Implementado en Fase 2 (pipeline PDF) y extendido en Fase 1 de Activos. `prisma/schema.prisma` es la fuente de verdad del schema.

## Modelo a respetar

`Activo` (antes `Product`, fusionado con el módulo patrimonial — ver `ARCHITECTURE.md` sección 6) representa una unidad física individual, no un catálogo reutilizable entre compras: no se deduplica por nombre. `Activo.importItemId` es opcional y apunta hacia `ImportItem` (relación invertida respecto al viejo `Product ← ImportItem`) — varios `Activo` pueden compartir el mismo `ImportItem` de origen cuando `quantity > 1`. `TipoActivo` (antes `Category`) es una tabla propia (no un enum plano) referenciada por `tipoActivoId` desde `Activo` e `ImportItem`; el enum `TipoActivoCode` cierra los valores válidos y se siembra vía `prisma/seed.ts` (exactamente 6 filas, nunca `OTROS`).

`CategoriaActivo`/`SubcategoriaActivo` son el segundo y tercer nivel de taxonomía bajo `TipoActivo` (administrable desde el sistema, profundidad fija de 2 niveles — no árbol infinito). `CampoEspecificacion` define campos dinámicos por subcategoría; `Catalogo`/`CatalogoValor` respaldan los de tipo `CATALOGO`/`SELECCION`. Ver la planificación de Activos para el detalle de fases (2-4 construyen la UI de estas tablas, todavía sin CRUD).

## Enums (definidos en schema.prisma)

- `ImportStatus`: `UPLOADED`, `PROCESSING`, `READY_FOR_REVIEW`, `COMPLETED`, `FAILED`.
- `Relevance`: `PRODUCT`, `CONSUMABLE`, `SERVICE`, `OTHER`.
- `TipoActivoCode`: `EQUIPOS_INFORMATICOS`, `EQUIPOS_DE_OFICINA`, `MUEBLES_DE_OFICINA`, `BIENES_VEHICULARES`, `EQUIPOS_DE_MAQUINARIA`, `BIENES_INMUEBLES`. Cerrado, sin `OTROS`.
- `ImportItemStatus`: `REVIEW_REQUIRED`, `CONFIRMED`, `REJECTED`, `IGNORED` (`IGNORED` = relevance != PRODUCT, auto).
- `ClassificationMethod`: `RULE`, `OLLAMA`, `MANUAL`.
- `ProcessingEngine`: `DOCLING`, `OCR`, `GLM_OCR`, `GRANITE_DOCLING`, `OLLAMA`.
- `ProcessingAttemptStatus`: `RUNNING`, `COMPLETED`, `FAILED`.
- `EstadoPatrimonial` (situación del activo): `DISPONIBLE`, `ASIGNADO`, `MANTENIMIENTO`, `BAJA`.
- `CondicionFisica` (estado físico observado, no confundir con `EstadoPatrimonial`): `NUEVO`, `BUENO`, `REGULAR`, `MALO`, `DETERIORADO`.
- `TipoDato` (para `CampoEspecificacion`): `TEXTO`, `NUMERO_ENTERO`, `NUMERO_DECIMAL`, `FECHA`, `BOOLEANO`, `SELECCION`, `CATALOGO`, `URL`.

## Prisma 7: generator y driver adapter

El generator usado es `prisma-client` (no `prisma-client-js`), con `output = "../lib/generated/prisma"` — carpeta generada, en `.gitignore`, nunca editada a mano. El import correcto es desde `lib/generated/prisma/client` (no hay barrel `index`).

Prisma 7 con este generator **requiere un driver adapter explícito** — `new PrismaClient()` sin adapter lanza error en runtime. Usar siempre `@prisma/adapter-pg` (`PrismaPg`) con `connectionString: process.env.DATABASE_URL`. El singleton de la app vive en `lib/db.ts` (patrón `globalThis` para no agotar conexiones con el hot-reload de Next.js) — importar `prisma` desde ahí en vez de instanciar `PrismaClient` en cada archivo.

La config del CLI (datasource URL, path de migraciones, comando de seed) vive en `prisma.config.ts`, no en `schema.prisma` ni en `package.json`.

## ImportItem: relevance y category son independientes

`ImportItem` **no** tiene un único par `classificationMethod`/`confidence` — tiene `relevanceMethod`/`relevanceConfidence` y `categoryMethod`/`categoryConfidence` por separado (migración `split-classification-fields`, Fase 8). Motivo: relevancia (Fase 6) y categoría (Fase 7) son clasificaciones independientes, cada una puede venir de `RULE` u `OLLAMA` con su propia confianza — un solo campo perdía cuál de las dos usó el fallback semántico y con qué confianza. Si se necesita ampliar esto a más etapas clasificadas, seguir el mismo patrón (prefijo por etapa), no volver a un par genérico.

## Migraciones

Toda migración se genera con el CLI de Prisma (`prisma migrate dev`), nunca se edita SQL de migración generado a mano salvo corrección de un problema puntual y documentado.

Detalle de índices/constraints/transacciones: ver skill `postgresql`.
