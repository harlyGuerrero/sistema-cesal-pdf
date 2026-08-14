---
name: typescript
description: Convenciones de tipado para este proyecto — Zod como fuente de tipos, contrato con el Python Document Service. Usar al definir tipos compartidos entre capas.
---

# TypeScript

## Zod como fuente de verdad

Los tipos de dominio que cruzan un límite de confianza (input de usuario, respuesta del Python Document Service) se derivan de un schema Zod (`z.infer<...>`), no se declaran por separado con `interface`/`type` duplicando la forma. Esto evita que el tipo y la validación diverjan.

## Contrato con el Python Document Service

La respuesta HTTP del Document Service (un `ProductCandidate[]` estructurado) se valida con Zod en el límite de Next.js antes de usarse. No asumir que el JSON que llega ya tiene la forma esperada — el servicio Python es un límite de confianza igual que un input de usuario.

Implementado en `lib/document-service/contract.ts` (`processResponseSchema`, `productCandidateSchema`), espejo de `document-service/app/contracts.py`. `lib/normalization/normalize.ts` consume el tipo `ProductCandidate` inferido de ahí — ver skill `import-workflow`.

## Enums cerrados

`relevance` (`PRODUCT`/`CONSUMABLE`/`SERVICE`/`OTHER`) y `category` (las 6 categorías patrimoniales) se modelan como union types literales o enum de Zod, nunca como `string` libre.
