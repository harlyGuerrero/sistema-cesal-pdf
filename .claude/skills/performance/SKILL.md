---
name: performance
description: Presupuestos de tiempo/recursos del pipeline documental y reglas para no bloquear Next.js. Usar al implementar procesamiento de PDF o listados de Dashboard/Productos/Importaciones.
---

# Performance

## No bloquear Next.js

El procesamiento de un PDF (Docling/OCR/VLM/Ollama) puede tomar segundos o minutos. Next.js nunca espera esa operación de forma síncrona en una request de usuario: el flujo es subir → encolar/disparar procesamiento → `Import.status = PROCESSING` → el usuario ve progreso, no un request colgado. El detalle de cómo se notifica el resultado (polling, webhook, etc.) se decide en la fase de implementación correspondiente, no en Fase 0.

## Presupuestos en el Document Service

Cada `ProcessingAttempt` respeta un timeout (ver skill `security`). Si Docling/OCR/VLM excede el presupuesto, el intento se marca fallido y el `Import` refleja el error — no se deja un proceso corriendo indefinidamente ni se reintenta sin límite.

## Listados (Dashboard/Productos/Importaciones)

Consultas de listado usan paginación e índices ya previstos en el modelo de datos (`status`, `fileHash`, `importId` — ver skill `postgresql`), no cargan el historial completo de importaciones en una sola query sin límite.

Conteos agregados por página (ej. productos/pendientes por `Import` en `/importaciones`, distribución por categoría en `/`) se calculan con un `groupBy`/`count` sobre el conjunto ya paginado, nunca con una query por fila (N+1) — ver `app/importaciones/page.tsx` y `app/page.tsx`.

## Páginas dinámicas por defecto (Fase 12)

Una página de Server Component sin `searchParams` ni otra API dinámica (cookies, headers) puede prerenderizarse **estática en build time** por defecto — Next no sabe que sus queries a Prisma deben repetirse por request. Encontrado en `/` (Dashboard): sin marcarla, los 4 números y la distribución por categoría quedaban congelados con los datos que hubiera en la base durante `npm run build`. Cualquier página que muestre datos que cambian y no reciba `searchParams` necesita `export const dynamic = "force-dynamic";` explícito. Verificar siempre el output de `npm run build` (columna `○ Static` vs `ƒ Dynamic`) al cerrar una fase que agrega una página nueva — no asumir que "compila" significa "sirve datos frescos".
