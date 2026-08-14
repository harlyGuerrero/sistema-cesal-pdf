---
name: validation
description: Convenciones de validación con Zod en los límites del sistema — input de usuario, respuesta del Document Service. Usar al definir cualquier schema de validación.
---

# Validation

## Dónde se valida

Todo dato que cruza un límite de confianza se valida con Zod antes de usarse:

- input de formularios de usuario (revisión/confirmación de `ImportItem`)
- upload de PDF (metadata: nombre, tamaño, mime — ver skill `security` para el detalle de amenaza)
- respuesta HTTP del Python Document Service hacia Next.js
- respuesta estructurada de Ollama (structured output) antes de usarla como clasificación válida

## Un schema, una fuente

El schema Zod de un dominio (ej. `ImportItem`) se define una sola vez y se reutiliza tanto para el formulario (React Hook Form resolver) como para la validación de API — no mantener dos definiciones separadas que puedan divergir.

## Enums cerrados

`relevance`, `category`, `status` de `Import`/`ImportItem` se validan contra los valores cerrados definidos en `ARCHITECTURE.md`, nunca como string libre aceptado y luego casteado.
