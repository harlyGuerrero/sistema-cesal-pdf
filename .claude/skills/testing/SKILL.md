---
name: testing
description: Convenciones de Vitest/Playwright y del benchmark de extracción para este proyecto. Usar al escribir tests o al evaluar si un cambio de pipeline es una regresión.
---

# Testing

## Vitest

Unit/integration tests de lógica de dominio en Next.js: schemas Zod, transiciones de estado de `Import`/`ImportItem`, lógica de clasificación (con el motor real o con fixtures deterministas, no mockeando el resultado que se está probando).

Configurado desde Fase 5 (`vitest.config.mts`, script `npm run test`). Los tests viven en `tests/*.test.ts` a nivel raíz (no colocados junto al código fuente) — ver `tests/normalization.test.ts` como referencia. El equivalente en Python (`document-service/tests/`, `pytest`) sigue la misma idea: tests desde que existe lógica no trivial que proteger, no hay que esperar a que llegue formalmente esta fase para escribirlos.

## Playwright

E2E de los flujos de usuario: subir PDF → ver estado de importación → revisar ítems con baja confianza → confirmar → ver producto en Productos/Dashboard.

## Benchmark de extracción

El benchmark (fixtures `factura-*.pdf` + expected products, ver `ARCHITECTURE.md` sección 8) es parte del suite de testing, no un script aparte que se corre "cuando alguien se acuerda". Un cambio en `document-ai`/`docling`/`pdf-extraction` que reduce las métricas del benchmark es una regresión y se trata como tal, aunque los tests unitarios pasen.

## Qué no hacer

No afirmar que el pipeline de extracción "funciona bien" basándose solo en los 4 fixtures iniciales — el benchmark mide regresión conocida, no generalización a documentos nuevos.
