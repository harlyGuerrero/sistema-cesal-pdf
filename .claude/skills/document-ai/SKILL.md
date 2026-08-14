---
name: document-ai
description: Reglas generales del Python Document Service — límites de responsabilidad frente a Docling/OCR/VLM/Ollama individualmente. Usar como punto de entrada antes de tocar cualquier pieza de extracción; ver también docling, ocr, vlm, ollama, pdf-extraction para el detalle de cada una.
---

# Document AI

Punto de entrada conceptual para todo lo que corre en el Python Document Service. Este skill fija los límites generales; el detalle específico de cada tecnología vive en su propio skill (`docling`, `ocr`, `vlm`, `ollama`, `pdf-extraction`) — no dupliques aquí lo que ya está ahí.

## Servicio (Fase 3)

Python + FastAPI en `document-service/` (venv propio en `document-service/.venv`, dependencias en `requirements.txt`). Arranque local: `document-service\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8001` (puerto configurable vía `DOCUMENT_SERVICE_PORT`).

- `GET /health` — liveness check.
- `POST /v1/documents/process` — recibe `multipart/form-data` con campo `file`. Valida extensión/MIME/tamaño/firma antes de procesar (`app/security.py`, ver skill `security`). Devuelve `ProcessResponse` (`app/contracts.py`).

Contrato de respuesta (`document`, `tables`, `products`, `metrics`) definido en `app/contracts.py`. Hasta Fase 4, `tables`/`products` siempre vuelven vacíos — el servicio ya valida y devuelve `document.pages` + `metrics` (hash, tamaño, tiempo), pero la extracción real (Docling) todavía no está conectada.

El Document Service expone su resultado como `ProductCandidate[]` estructurado vía HTTP, consumido por Next.js. Next.js nunca ve el PDF crudo ni las estructuras internas de Docling/OCR.

## Pipeline de extracción (dentro del Document Service)

```
Document Extraction (Docling) → Layout → Tables → Product Table Detection → Product Rows → Product Candidate
```

Cada etapa es responsabilidad de una tecnología específica (ver skills individuales). No colapsar etapas para "simplificar" — la separación es lo que permite comparar motores en el benchmark.

## Detección estructural

Regla transversal a todas las tecnologías de extracción: nunca coordenadas hardcodeadas, nombres de proveedores, ni reglas por factura específica. Ver `ARCHITECTURE.md` sección 4.
