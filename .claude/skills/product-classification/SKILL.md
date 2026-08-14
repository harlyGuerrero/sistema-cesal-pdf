---
name: product-classification
description: Reglas de clasificación de relevancia y categoría patrimonial — las 6 categorías cerradas, umbral de confidence, disparo de Human Review. Usar al implementar las etapas Relevance Classification/Patrimonial Classification/Confidence/Human Review.
---

# Product Classification

## Relevancia (no es categoría patrimonial)

```
PRODUCT      → activo físico candidato a patrimonio
CONSUMABLE   → se agota con el uso → se ignora (ej. "Tinta HP" → CONSUMABLE → ignorar)
SERVICE      → no es un bien físico → se ignora
OTHER        → no clasificable en los anteriores → se ignora salvo revisión manual
```

Solo `PRODUCT` avanza a clasificación patrimonial.

### Implementación (Fase 6)

`lib/classification/relevance.ts` (`classifyRelevance`), Next.js/TypeScript, sobre `NormalizedProductCandidate` (Fase 5) — no toca Prisma ni el Document Service. Solo reglas por ahora: patrones (`CONSUMABLE_PATTERNS`/`SERVICE_PATTERNS`) sobre `normalizedName`. Coincidencia → confianza 0.9; sin coincidencia → `PRODUCT` por defecto con confianza 0.65 (ausencia de evidencia en contra, no certeza). El motor de reglas **nunca** devuelve `OTHER` directamente — queda reservado para cuando el fallback de Ollama (Fase 7, `ClassificationProvider`) esté conectado.

Define su propio `relevanceSchema`/tipo `Relevance` en Zod, independiente del enum `Relevance` de Prisma (`prisma/schema.prisma`) — incluso siendo el mismo conjunto de valores, es intencional: Classification no debe importar el cliente generado de Prisma (acoplaría esta etapa a Persistence, ver regla `Extraction != Relevance != Classification != Persistence`). Ver skill `typescript`.

El listado de patrones en `CONSUMABLE_PATTERNS`/`SERVICE_PATTERNS` es clasificación semántica acotada al dominio (oficina/TI/vehicular/maquinaria), no la "lista enorme de palabras prohibidas" que `ARCHITECTURE.md` 4 prohíbe — esa prohibición es sobre detección estructural de tablas/columnas, un problema distinto.

Tests en `tests/relevance.test.ts`.

## Categorías patrimoniales (exactamente 6, cerradas)

```
EQUIPOS_INFORMATICOS
EQUIPOS_DE_OFICINA
MUEBLES_DE_OFICINA
BIENES_VEHICULARES
EQUIPOS_DE_MAQUINARIA
BIENES_INMUEBLES
```

Nunca crear `OTROS`. Un `PRODUCT` que no encaja con confianza suficiente en ninguna de las 6 va a Human Review, no se fuerza a la categoría más probable sin marcarlo como incierto.

### Implementación (Fase 7) — Clasificación híbrida

`lib/classification/category.ts` (`classifyCategory`): reglas → si `confidence >= HIGH_CONFIDENCE_THRESHOLD` (0.8) devuelve ese resultado sin llamar a Ollama → si no, fallback a `OllamaCategoryProvider`. No se envía todo a Ollama, solo lo que las reglas no resuelven.

- `lib/classification/provider.ts` — interfaz genérica `ClassificationProvider<TInput, TValue>` (`classify(input): Promise<ClassificationResult<TValue> | null>`). La app depende de esta interfaz, nunca de Ollama directamente.
- `lib/classification/category-rules.ts` (`RuleCategoryProvider`) — patrones por categoría sobre `normalizedName`; si matchea exactamente una categoría → confianza 0.85; si no matchea ninguna o matchea más de una (ambiguo) → `null` (nunca fuerza).
- `lib/classification/ollama-provider.ts` (`OllamaCategoryProvider`) — ver skill `ollama` para el detalle de implementación, modelo, timeout y el hallazgo de calibración.

**Importante para cuando se implemente Human Review (Fase 9)**: no tratar `confidence` de `method: "OLLAMA"` igual que la de `method: "RULE"` para decidir auto-confirmación — ver la nota de calibración en skill `ollama`. Los resultados de Ollama son evidencia útil para el revisor humano, no una fuente confiable de auto-confirmación con el mismo umbral que las reglas.

Tests: `tests/category-rules.test.ts`, `tests/ollama-provider.test.ts` (con `fetch` inyectado, no requieren Ollama corriendo), `tests/category.test.ts` (orquestador, con providers falsos inyectados).

## Confidence y Human Review

Cada clasificación (relevancia y categoría) lleva un `confidence` y un `classificationMethod` (qué heurística o modelo la produjo). Por debajo del umbral definido, o ante ambigüedad real entre dos categorías con score similar, el `ImportItem` pasa a estado que requiere revisión humana antes de `Confirmation`. No auto-confirmar para evitar fricción.

## Separación de campos

`relevance` y `category` son campos distintos en `ImportItem`, nunca combinados en un solo valor ni inferido el uno del otro sin pasar por su propia clasificación.
