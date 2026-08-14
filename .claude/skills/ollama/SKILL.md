---
name: ollama
description: Rol y límites de Ollama en este proyecto — clasificación semántica, fallback, structured output. Usar al implementar la etapa de clasificación que invoca un modelo local.
---

# Ollama

## Rol

Clasificación semántica de `ProductCandidate` (relevancia y categoría patrimonial) en casos donde la heurística estructural no basta, fallback general, y generación de structured output (respuesta forzada a un schema conocido, ej. vía Zod/JSON schema).

## Lo que NO es

Ollama no es el parser principal del PDF y no se usa para compensar errores de extracción estructural (tablas mal detectadas, columnas desalineadas, texto mal segmentado). Si la extracción está rota, el fix va en `document-ai`/`docling`/`pdf-extraction`, no en el prompt de clasificación.

## Modelos

`GLM-OCR`/`GraniteDocling` (evaluados vía benchmark, `ARCHITECTURE.md` sección 8) son modelos de visión para el Document Service (OCR/VLM sobre imágenes de páginas) — **no** son los modelos usados para clasificación de texto (relevancia/categoría), que es una tarea de lenguaje, no de visión. Para clasificación se usa un modelo de texto separado, configurable vía `OLLAMA_CATEGORY_MODEL` (ver Implementación).

## Structured output

Toda invocación a Ollama que alimenta clasificación debe forzar salida estructurada (schema conocido), nunca parsear texto libre de la respuesta con regex o heurísticas ad hoc.

## Trazabilidad

Cada invocación relevante se registra como `ProcessingAttempt` con motor `OLLAMA`, incluyendo qué modelo específico se usó, para poder comparar modelos en el benchmark.

## Implementación (Fase 7)

Ollama corre localmente (`winget install Ollama.Ollama`), servidor en `http://127.0.0.1:11434`, arranca automáticamente. Modelo de clasificación por defecto: `qwen2.5:3b-instruct` (~1.9GB), configurable vía `OLLAMA_CATEGORY_MODEL` / `OLLAMA_HOST` env vars — nunca hardcodeado, ver `lib/classification/ollama-provider.ts` (`OllamaCategoryProvider`).

Usa `/api/chat` con `format` = JSON Schema (structured output nativo de Ollama, no post-procesamiento de texto). La respuesta se parsea con `JSON.parse` y se valida contra un schema Zod (`categoryContentSchema`) antes de usarse — si no valida, la categoría queda fuera del enum cerrado, o Ollama no responde/da timeout, el provider devuelve `null`, nunca inventa una clasificación.

**Timeout**: 30s por defecto (`timeoutMs`), no 15s — medido en esta fase que la primera invocación tras iniciar/cambiar de modelo tarda ~15s solo en cargarlo en memoria; un timeout más corto pierde clasificaciones válidas, no solo las realmente colgadas.

**Hallazgo importante — calibración de confianza**: se midió `qwen2.5:3b-instruct` contra 8 ejemplos de las 6 categorías: 5/8 correctos, y **reportó confianza alta (0.8–0.95) tanto en aciertos como en errores** (ej. clasificó "GENERADOR ELECTRICO" y "MONTACARGAS" como `BIENES_VEHICULARES` con confianza 0.95). `llama3.2:1b` fue peor (4/8) con el mismo patrón. Conclusión: **la confianza que reporta Ollama no está bien calibrada y no debe tratarse con la misma confianza que la de las reglas determinísticas** al decidir si un `ImportItem` puede saltarse Human Review — Fase 9 debe aplicar un umbral más estricto (o exigir revisión siempre) para resultados con `method: "OLLAMA"`, no reusar `HIGH_CONFIDENCE_THRESHOLD` (0.8) tal cual. Esto es evidencia de una muestra chica (8 casos, sin los fixtures reales todavía) — reevaluar con el benchmark real en Fase 14.
