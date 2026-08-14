---
name: import-workflow
description: Estados y transiciones de Import/ImportItem, y la relación Product/ImportItem/Import. Usar al implementar el flujo de subida, procesamiento, revisión y confirmación de un PDF.
---

# Import Workflow

## Estados de Import

```
UPLOADED → PROCESSING → READY_FOR_REVIEW → COMPLETED
                      ↘ FAILED
PROCESSING → FAILED
```

No saltar estados (ej. no pasar de `UPLOADED` directo a `COMPLETED`). `errorMessage` se llena solo en `FAILED`. `processedAt` marca fin de procesamiento automático; `completedAt` marca cierre tras confirmación humana.

## ImportItem

Cada fila de producto detectada es un `ImportItem`, con su propio ciclo: extraído → clasificado → (revisado si aplica) → confirmado. `status` de `ImportItem` es independiente del `status` de su `Import` — un `Import` pasa a `READY_FOR_REVIEW` cuando todos sus `ImportItem` están clasificados, y a `COMPLETED` cuando todos están confirmados o descartados.

## Relación con Product

`ImportItem` referencia a `Import` (obligatorio) y a `Product` (nullable hasta `Confirmation`). Confirmar un `ImportItem` significa: vincularlo a un `Product` existente (mismo producto ya importado antes) o crear uno nuevo. `Product` nunca tiene `importId` obligatorio — no asumir que un producto pertenece a una sola importación. Ver `ARCHITECTURE.md` sección 6.

## Historial

El historial de cada PDF importado se conserva indefinidamente vía `Import` + sus `ImportItem` + sus `ProcessingAttempt`, incluso después de `COMPLETED`. No borrar `Import` al confirmarse sus ítems.

## Normalization (Fase 5, implementado)

Etapa Next.js, entre la respuesta del Document Service y Relevance/Classification: `Document Service → normalization → relevance → classification → crear ImportItems`. Vive en `lib/normalization/normalize.ts` (`normalizeProductCandidate`), independiente de Prisma y del Document Service — opera sobre el tipo `ProductCandidate` de `lib/document-service/contract.ts`.

Nunca modifica `rawText`; agrega `normalizedName`/`normalizedQuantity`/`normalizedUnitPrice`/`normalizedTotalPrice`/`normalizedCurrency` sin tocar los campos originales. `normalizedName`: NFKC, colapsa espacios, recorta ruido de bordes (`|`, `-`, `.` sueltos de celdas mal cortadas), mayúsculas. Cantidades/precios: redondeo a 3/2 decimales respectivamente (alineado con `Decimal(14,3)`/`Decimal(14,2)` en el schema). Moneda: si el Document Service no la manda, se detecta por símbolo (`S/`→PEN, `$`/`USD`→USD, `€`/`EUR`→EUR) buscando en `rawText`; si no hay símbolo, `null` — nunca se asume una moneda por defecto.

Tests en `tests/normalization.test.ts` (Vitest).

## Import Workflow (Fase 8, implementado)

`POST /api/imports` (`app/api/imports/route.ts`) recibe `multipart/form-data` con campo `file`. Orquestador: `lib/import-workflow/process-upload.ts` (`processUpload`) — único módulo que llama en secuencia a validación/hash → dedupe → `Import` → `lib/document-service/client.ts` → `normalizeProductCandidate` → `classifyRelevance` → `classifyCategory` (solo si `relevance === "PRODUCT"`) → `ImportItem`. Cada etapa sigue viviendo en su propio módulo; este archivo solo orquesta y persiste.

**No auto-confirma nada** (regla explícita de esta fase): todo `ImportItem` con `relevance === "PRODUCT"` nace en `REVIEW_REQUIRED`; el resto en `IGNORED`. La distinción `CONFIRMED` automático por confidence alta (ver skill product-classification, "REGLAS DE REVISIÓN") es de Fase 9, no de aquí.

**Transacciones**: el `Import` se crea en su propio statement (para tener `id` antes de llamar al Document Service). La llamada al Document Service y las clasificaciones (incluyendo posibles llamadas a Ollama) ocurren **fuera** de una transacción — son I/O externo lento (Docling puede tardar ~20s en frío) y no deben mantener una transacción de DB abierta. Los `ImportItem` + `ProcessingAttempt` (Ollama, si se usó) + actualización de `Import.status` a `READY_FOR_REVIEW` sí van en un único `prisma.$transaction([...])` al final, una vez que todo el resultado ya está calculado en memoria.

**Duplicados**: `Import.findUnique({ where: { fileHash } })` antes de crear nada. Si existe, `409` con el `importId` existente — no se reprocesa, no se crea una fila nueva.

**ProcessingAttempt**: una fila `DOCLING` por cada llamada al Document Service (éxito o `FAILED` con `errorMessage`). Una fila `OLLAMA` agregada por `Import` (no una por ítem) solo si al menos un ítem usó el fallback, con `metadata.itemsClassifiedByOllama`.

Validado end-to-end contra servicios reales (Postgres, Document Service, Ollama) en Fase 8 — ver reporte de esa fase. Sin test automatizado de `processUpload` en sí (requiere Postgres + Document Service + Ollama corriendo; se evaluará si vale la pena un test de integración en Fase 14). Sí hay tests unitarios de sus piezas: `tests/pdf-validation.test.ts`, `tests/document-service-client.test.ts`.

## Review (Fase 9, implementado)

`/importaciones/[id]` (`app/importaciones/[id]/page.tsx`, Server Component) + `review-table.tsx` (Client Component) + `actions.ts` (Server Actions: `confirmItemAction`, `rejectItemAction`, `editAndConfirmItemAction`).

**Regla de auto-confirmación** (la que Fase 8 dejó pendiente): se implementó en `process-upload.ts`, no en la UI — un `ImportItem` con `relevance === "PRODUCT"` se auto-confirma en el momento de creación (`status: CONFIRMED`, `productId` ya vinculado) **solo si** `categoryMethod === "RULE"` (que siempre es 0.85, sobre `HIGH_CONFIDENCE_THRESHOLD`). Un resultado `OLLAMA` **nunca** auto-confirma, sin importar su confidence — por el problema de calibración medido en Fase 7 (ver skill `ollama`). Los ítems auto-confirmados quedan con `reviewedAt: null` (nadie los revisó); los que confirma/edita/rechaza un humano desde esta pantalla sí llevan `reviewedAt`. `reviewedBy` queda `null` siempre — no hay autenticación todavía (fuera de alcance, ver CLAUDE.md).

**`Import.status` tras procesar**: si ningún ítem quedó en `REVIEW_REQUIRED` (todo se auto-confirmó o se ignoró), el `Import` pasa directo a `COMPLETED` en vez de `READY_FOR_REVIEW` — ver `process-upload.ts`.

**Find-or-create de `Product`**: `lib/import-workflow/product-matching.ts` (`findOrCreateProduct`), por `categoryId` + `normalizedName` exactos. Compartido entre el auto-confirm de Fase 8 y las tres acciones humanas de Fase 9 — no duplicar esta lógica en otro lado.

**`Import.status` tras una acción humana**: `completeImportIfNoPending` (en `actions.ts`) pasa el `Import` a `COMPLETED` cuando ya no queda ningún `ImportItem` en `REVIEW_REQUIRED` — solo si estaba en `READY_FOR_REVIEW` (`updateMany` con ese filtro, idempotente, no reabre un `Import` ya `COMPLETED`/`FAILED`).

**Bug real encontrado y corregido en esta fase** (Document Service, no Next.js): `parse_number` es demasiado permisivo para decidir si una *columna* es numérica — un nombre de producto con modelo ("LAPTOP LATITUDE 5420", "ESTABILIZADOR 2000VA") hacía que la columna de descripción pareciera numérica y la tabla completa se descartaba (`isProductTable: false`, 0 productos). Ver skill `pdf-extraction` para el detalle del fix (`is_numeric_cell`).

Sin browser real disponible en esta sesión para probar la pantalla de forma interactiva (extensión Chrome no instalada) — se verificó sirviendo la página real con datos reales y leyendo el HTML resultante, y se probaron las tres Server Actions directamente contra la base de datos real (fuera del runtime de Next, ignorando el error esperado de `revalidatePath` fuera de contexto de request). No sustituye una prueba de clicks real; si algo se ve mal visualmente en el navegador, avisa.

## Productos (Fase 10, implementado)

`/productos` (listado con búsqueda `?q=` sobre `normalizedName` case-insensitive + filtro `?categoryId=`, ambos vía `<form method="get">` — sin JS, compartible/bookmarkeable), `/productos/[id]` (detalle + edición + historial de `ImportItem` con link a cada `Import` + eliminación), `/productos/nuevo` (creación manual). Acciones en `app/productos/actions.ts`.

**No duplicar productos**: `createProductAction` normaliza el nombre con `normalizeName` (Fase 5) y reutiliza `findOrCreateProduct` (Fase 9) — si ya existe un producto con el mismo `categoryId` + `normalizedName`, redirige a ese en vez de crear uno nuevo (con `?duplicate=1` para avisar en la UI). Mismo criterio para edición: `updateProductAction` recalcula `normalizedName` desde el nombre editado.

**Eliminación controlada**: `deleteProductAction` cuenta `importItems` antes de borrar — si tiene alguno, lanza error y no borra (protege la trazabilidad `Product ← ImportItem ← Import`). La UI ni siquiera muestra el botón de eliminar habilitado si el producto tiene historial (`DeleteProductButton`, ver `hasHistory`).

**Patrón redirect() + try/catch en cliente**: `createProductAction`/`deleteProductAction` llaman `redirect()` en el camino feliz. Cuando se invocan desde un Client Component envueltas en `try/catch` (para mostrar errores de validación), hay que dejar pasar el error de redirect sin capturarlo — se identifica por `error.digest` empezando con `"NEXT_REDIRECT"` (no por `error.message`). Ver `new-product-form.tsx` y `delete-product-button.tsx` para el patrón exacto.

**Desviación RHF+Zod** (misma que Fase 9, ver skill `shadcn-ui`): los 3 formularios de esta fase (`ProductEditForm`, `DeleteProductButton`, `NewProductForm`) tampoco usan React Hook Form — mismo criterio de simplicidad para formularios cortos.

Validado con datos reales insertados directamente en Postgres (listado, búsqueda, filtro por categoría vía HTTP real) y las 3 acciones probadas contra la base de datos real (update, create con deduplicación exitosa, delete bloqueado con historial y permitido sin historial) — mismo enfoque que Fase 9 por no haber browser disponible.

## Historial (Fase 11, implementado)

`/importaciones` (`app/importaciones/page.tsx`): listado de todos los `Import`, columnas Archivo/Fecha/Estado/Productos/Revisión/Errores/Duración/Acciones. "Ver detalle" enlaza a `/importaciones/[id]` (Fase 9) — esa pantalla ya cubre "ver resultados/items/errores" del DoD, no se duplicó nada nuevo para eso.

- **Productos**: conteo de `ImportItem` con `relevance === "PRODUCT"` (no el total de candidatos).
- **Revisión**: conteo de `status === "REVIEW_REQUIRED"`, mostrado como badge solo si > 0.
- **Duración**: `processedAt - createdAt` del `Import` (tiempo total de principio a fin), no la duración de un `ProcessingAttempt` individual.
- **Sin N+1**: los conteos por importación se calculan con un solo `importItem.groupBy({ by: ["importId", "relevance", "status"] })` sobre la página completa de imports, no una query por fila.

**Refactor**: las etiquetas/variantes de badge de `Import.status` e `ImportItem.status` (antes duplicadas entre esta pantalla y `/importaciones/[id]`) se extrajeron a `lib/import-workflow/labels.ts` (`IMPORT_STATUS_LABELS`/`IMPORT_STATUS_VARIANT`/`IMPORT_ITEM_STATUS_LABELS`/`IMPORT_ITEM_STATUS_VARIANT`) — usar ese módulo, no redefinir estos mapas en una pantalla nueva.

Validado con datos reales insertados en Postgres (3 imports: completado con 1 producto, fallido con `errorMessage`, pendiente con 2 ítems en revisión) leyendo el HTML servido por el dev server real — conteos, badges de estado, truncado de error y formato de duración confirmados correctos.
