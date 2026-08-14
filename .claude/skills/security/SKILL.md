---
name: security
description: Modelo de amenaza para PDFs como input no confiable — validación de MIME/extensión/tamaño/firma/hash, límites y timeouts. Usar al implementar el endpoint de subida y cualquier punto que reciba o reenvíe un PDF.
---

# Security

Los PDFs son input no confiable, tanto los que sube un usuario como cualquier archivo que el Python Document Service reciba.

## Validación obligatoria antes de procesar

- **MIME type** declarado.
- **Extensión** del archivo.
- **Firma de archivo** (magic bytes `%PDF-`), no confiar solo en extensión/MIME declarados por el cliente.
- **Tamaño máximo** de archivo.
- **Hash** (`fileHash`) — para deduplicación y para poder auditar qué se procesó.
- **Límites de recursos**: número de páginas, tamaño de tablas, memoria.
- **Timeouts** de procesamiento en el Document Service — un PDF malformado no debe poder colgar el servicio indefinidamente.

## Regla dura

Nunca ejecutar contenido embebido del PDF (JavaScript embebido, acciones automáticas, referencias externas). El PDF se trata como datos, no como código.

## Dónde aplica

Esta validación ocurre en el límite de entrada (endpoint de subida en Next.js, y de nuevo en el Document Service si recibe el archivo directamente) — no confiar en que "ya se validó antes" entre servicios distintos.

## Implementación (Fase 8)

`lib/security/pdf-validation.ts` (Next.js) reimplementa las mismas validaciones que `document-service/app/security.py` (Fase 3) — extensión, MIME, tamaño, firma `%PDF-`, hash SHA-256. Esto **no** es la duplicación que evita CLAUDE.md ("no duplicar reglas entre archivos/skills"): esa regla es sobre no repetir la misma lógica dentro de la misma capa; acá son dos límites de confianza distintos (Next.js recibe el upload del usuario, el Document Service podría recibir el archivo de otra fuente en el futuro) en dos lenguajes distintos, cada uno debe poder validar sin depender del otro.

`app/api/imports/route.ts` envuelve `request.formData()` en `try/catch` — un body malformado (sin boundary multipart válido) lanza una excepción no relacionada con `PdfValidationError`, y sin ese `catch` se cae a un 500 no manejado en vez de un 400 (encontrado y corregido en Fase 8, ver reporte de esa fase).
