---
name: postgresql
description: Reglas de índices, constraints y transacciones en PostgreSQL para este proyecto. Usar al diseñar queries o migraciones que afectan integridad de datos.
---

# PostgreSQL

Implementado desde Fase 2, base de datos real en uso desde Fase 8.

## Constraints obligatorios

- `Import.fileHash` único: deduplicación de PDFs ya procesados; reintentar subir el mismo PDF no debe crear un `Import` duplicado sin avisar.
- Integridad referencial `ImportItem → Import` y `ImportItem → Product` (esta última nullable hasta `Confirmation`).
- Enums de PostgreSQL (o check constraints) para `ImportStatus`, `Relevance`, `PatrimonialCategory`, `ProcessingEngine` — nunca columnas de texto libre para estos campos.

## Transacciones

Confirmar un `ImportItem` (pasar a `Product` persistido, actualizar estado) es una operación atómica: crear/actualizar `Product`, vincular `ImportItem`, y actualizar el estado del `Import` si corresponde, todo en una transacción. Un fallo a mitad de camino no debe dejar un `ImportItem` confirmado sin `Product`, ni viceversa.

Regla general (ver implementación real en skill `import-workflow`, Fase 8): nunca mantener una transacción abierta durante I/O externo lento (llamadas HTTP al Document Service u Ollama, que pueden tardar hasta ~20s). Hacer el trabajo lento fuera de la transacción, calcular todo el resultado en memoria, y persistir con `prisma.$transaction([...])` solo al final, con statements rápidos.

## Índices

Indexar `Import.fileHash`, `Import.status`, `ImportItem.status` y `ImportItem.importId` — son los campos por los que se filtra en Dashboard e Importaciones.
