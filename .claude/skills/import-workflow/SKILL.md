---
name: import-workflow
description: Estados y transiciones de Import/ImportItem, y la relación Activo/ImportItem/Import (Activo, antes Product, fusionado con el módulo patrimonial). Usar al implementar el flujo de subida, procesamiento, revisión y confirmación de un PDF.
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

## Relación con Activo (antes Product)

`ImportItem` referencia a `Import` (obligatorio). La relación hacia `Activo` está invertida respecto al viejo modelo: es `Activo.importItemId` (nullable), no `ImportItem.productId`. Confirmar un `ImportItem` **crea** Activo(s) nuevos — nunca busca ni reutiliza uno existente por nombre. Si la fila tiene `quantity > 1`, se crea un `Activo` por unidad física (ver `lib/import-workflow/activo-creation.ts`). Ver `ARCHITECTURE.md` sección 6.

## Historial

El historial de cada PDF importado se conserva indefinidamente vía `Import` + sus `ImportItem` + sus `ProcessingAttempt`, incluso después de `COMPLETED`. No borrar `Import` al confirmarse sus ítems.

## Normalization (Fase 5, implementado)

Etapa Next.js, entre la respuesta del Document Service y Relevance/Classification: `Document Service → normalization → relevance → classification → crear ImportItems`. Vive en `lib/normalization/normalize.ts` (`normalizeProductCandidate`), independiente de Prisma y del Document Service — opera sobre el tipo `ProductCandidate` de `lib/document-service/contract.ts`.

Nunca modifica `rawText`; agrega `normalizedName`/`normalizedQuantity`/`normalizedUnitPrice`/`normalizedTotalPrice`/`normalizedCurrency` sin tocar los campos originales. `normalizedName`: NFKC, colapsa espacios, recorta ruido de bordes (`|`, `-`, `.` sueltos de celdas mal cortadas), mayúsculas. Cantidades/precios: redondeo a 3/2 decimales respectivamente (alineado con `Decimal(14,3)`/`Decimal(14,2)` en el schema). Moneda: si el Document Service no la manda, se detecta por símbolo (`S/`→PEN, `$`/`USD`→USD, `€`/`EUR`→EUR) buscando en `rawText`; si no hay símbolo, `null` — nunca se asume una moneda por defecto.

Tests en `tests/normalization.test.ts` (Vitest).

## Import Workflow (Fase 8, implementado)

`POST /api/imports` (`app/api/imports/route.ts`) recibe `multipart/form-data` con campo `file`. Orquestador: `lib/import-workflow/process-upload.ts` (`processUpload`) — único módulo que llama en secuencia a validación/hash → dedupe → `Import` → `lib/document-service/client.ts` → `normalizeProductCandidate` → `classifyRelevance` → `classifyCategory` (solo si `relevance === "PRODUCT"`) → `ImportItem`. Cada etapa sigue viviendo en su propio módulo; este archivo solo orquesta y persiste.

**No auto-confirma nada, nunca** (regla explícita, reforzada en Fase 39 a pedido del usuario): todo `ImportItem` con `relevance === "PRODUCT"` nace en `REVIEW_REQUIRED`, sin importar qué tan alta sea la confianza de la clasificación por regla; el resto en `IGNORED`. Fase 9 llegó a auto-confirmar por regla de alta confianza (`categoryMethod === "RULE"` + `confidence >= HIGH_CONFIDENCE_THRESHOLD`) pero esa rama se eliminó por completo en Fase 39 — no reintroducirla. `classifyCategory` sigue corriendo igual para precargar el formulario de revisión (categoría sugerida + barra de confianza), solo que ya no decide el `status` por sí sola.

**Transacciones**: el `Import` se crea en su propio statement (para tener `id` antes de llamar al Document Service). La llamada al Document Service y las clasificaciones (incluyendo posibles llamadas a Ollama) ocurren **fuera** de una transacción — son I/O externo lento (Docling puede tardar ~20s en frío) y no deben mantener una transacción de DB abierta. Los `ImportItem` + `ProcessingAttempt` (Ollama, si se usó) + actualización de `Import.status` a `READY_FOR_REVIEW` sí van en un único `prisma.$transaction([...])` al final, una vez que todo el resultado ya está calculado en memoria.

**Duplicados**: `Import.findUnique({ where: { fileHash } })` antes de crear nada. Si existe, `409` con el `importId` existente — no se reprocesa, no se crea una fila nueva.

**ProcessingAttempt**: una fila `DOCLING` por cada llamada al Document Service (éxito o `FAILED` con `errorMessage`). Una fila `OLLAMA` agregada por `Import` (no una por ítem) solo si al menos un ítem usó el fallback, con `metadata.itemsClassifiedByOllama`.

Validado end-to-end contra servicios reales (Postgres, Document Service, Ollama) en Fase 8 — ver reporte de esa fase. Sin test automatizado de `processUpload` en sí (requiere Postgres + Document Service + Ollama corriendo; se evaluará si vale la pena un test de integración en Fase 14). Sí hay tests unitarios de sus piezas: `tests/pdf-validation.test.ts`, `tests/document-service-client.test.ts`.

## Review (Fase 9, implementado)

`/importaciones/[id]` (`app/importaciones/[id]/page.tsx`, Server Component) + `review-table.tsx` (Client Component) + `actions.ts` (Server Actions: `confirmItemAction`, `rejectItemAction`, `editAndConfirmItemAction`).

**Confirmación siempre manual** (Fase 9, endurecida en Fase 39): un `ImportItem` con `relevance === "PRODUCT"` nace en `REVIEW_REQUIRED` sin excepción — la auto-confirmación por regla de alta confianza que existió entre Fase 9 y Fase 38 se eliminó por completo. Todo activo detectado pasa por esta pantalla; lo confirma, edita o rechaza un humano. `reviewedAt` se llena en las tres acciones (`confirmItemAction`, `rejectItemAction`, `editAndConfirmItemAction`); ya no existe el caso "auto-confirmado con `reviewedAt: null`". `reviewedBy` sigue sin usarse (columna existe, nada la escribe todavía).

**`Import.status` tras procesar**: si ningún ítem quedó en `REVIEW_REQUIRED` (o sea, todo se ignoró — ya no hay auto-confirmación que también cuente), el `Import` pasa directo a `COMPLETED` en vez de `READY_FOR_REVIEW` — ver `process-upload.ts`.

**Creación de Activo(s)**: `lib/import-workflow/activo-creation.ts` (`createActivosFromImportItem`/`buildActivoRows`). Ya no busca coincidencias — cada confirmación crea `Activo` nuevos, uno por unidad física según `quantity` (`quantityToUnitCount`, redondea y trata `quantity` nulo/inválido como 1), llamado únicamente desde `confirmItemAction`/`editAndConfirmItemAction` (Fase 9) — `process-upload.ts` (Fase 8) ya no crea `Activo` en absoluto. Cada `Activo` creado también recibe un `Movimiento(ALTA)` (Fase 39, `usuarioId` = quien confirmó, `motivo` vía `motivoAltaPorImportacion`) y un `AuditoriaLog(DAR_DE_ALTA)` con `detalle.origen: "pdf"` (Fase 41 — Fase 39 había agregado el `Movimiento` pero se olvidó la auditoría, así que un activo confirmado desde PDF no aparecía en `/auditoria`; mismo patrón que el alta manual y la importación por Excel, ver `lib/activos/excel-import.ts`) — antes esta ruta era la única forma de crear un `Activo` sin dejar rastro en `/movimientos` ni en `/auditoria`.

**`Import.status` tras una acción humana**: `completeImportIfNoPending` (en `actions.ts`) pasa el `Import` a `COMPLETED` cuando ya no queda ningún `ImportItem` en `REVIEW_REQUIRED` — solo si estaba en `READY_FOR_REVIEW` (`updateMany` con ese filtro, idempotente, no reabre un `Import` ya `COMPLETED`/`FAILED`).

**Bug real encontrado y corregido en esta fase** (Document Service, no Next.js): `parse_number` es demasiado permisivo para decidir si una *columna* es numérica — un nombre de producto con modelo ("LAPTOP LATITUDE 5420", "ESTABILIZADOR 2000VA") hacía que la columna de descripción pareciera numérica y la tabla completa se descartaba (`isProductTable: false`, 0 productos). Ver skill `pdf-extraction` para el detalle del fix (`is_numeric_cell`).

Sin browser real disponible en esta sesión para probar la pantalla de forma interactiva (extensión Chrome no instalada) — se verificó sirviendo la página real con datos reales y leyendo el HTML resultante, y se probaron las tres Server Actions directamente contra la base de datos real (fuera del runtime de Next, ignorando el error esperado de `revalidatePath` fuera de contexto de request). No sustituye una prueba de clicks real; si algo se ve mal visualmente en el navegador, avisa.

## Productos / Activos (Fase 10 del pipeline PDF; Fase 1 de Activos)

`/productos` (listado con búsqueda `?q=` sobre `nombreNormalizado` case-insensitive + filtro `?categoryId=`, ambos vía `<form method="get">` — sin JS, compartible/bookmarkeable), `/productos/[id]` (detalle + edición + origen: `ImportItem`/`Import` si viene de una importación, o "creado manualmente" + eliminación), `/productos/nuevo` (creación manual). Acciones en `app/productos/actions.ts`. La ruta y el copy siguen diciendo "productos" a propósito — el rename de UI hacia "Activos" queda para la fase 6 de Activos (pantallas reales), no se mezcló con el cambio de modelo de Fase 1.

**Ya no se deduplica**: `createProductAction` crea un `Activo` directo (`prisma.activo.create`) — dos activos con el mismo nombre son normales (dos unidades físicas distintas), no un error. Ya no existe el flujo `?duplicate=1`. Mismo criterio para edición: `updateProductAction` recalcula `nombreNormalizado` desde el nombre editado.

**Eliminación controlada**: `deleteProductAction` bloquea el borrado si `activo.importItemId` no es null (protege la trazabilidad `Activo → ImportItem → Import`) — ya no es un conteo (`_count.importItems`), es un solo FK opcional. La UI ni siquiera muestra el botón de eliminar habilitado si el activo tiene ese origen (`DeleteProductButton`, ver `hasHistory`).

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
