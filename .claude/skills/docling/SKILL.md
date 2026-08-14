---
name: docling
description: Uso de Docling para extracción de documento, layout y tablas (TableFormer). Usar al implementar las etapas Document Extraction/Layout/Tables del pipeline.
---

# Docling

Responsable de las primeras etapas del pipeline dentro del Document Service: `Document Extraction → Layout → Tables`.

## Alcance

- Extraer texto y estructura de layout del PDF.
- Detectar tablas mediante TableFormer.
- Entregar tablas como estructura (filas/columnas con posición relativa), no como texto plano sin estructura.

## Límite

Docling entrega tablas candidatas. **No** decide cuál de esas tablas es la tabla de productos (eso es Product Table Detection, heurística estructural — ver `document-ai`) ni clasifica relevancia/categoría (eso es `product-classification`).

## Fallback

Si Docling no logra extraer texto de una región (típicamente páginas escaneadas o imágenes), esa región se delega a OCR (ver skill `ocr`), no se descarta silenciosamente.

## Implementación (Fase 4)

`document-service/app/extraction/docling_adapter.py` es el único módulo que importa `docling` — el resto de `app/extraction/` trabaja sobre `Table` (`models.py`, genérico: `page`, `index`, `rows: list[list[str]]`), sin saber que Docling existe. Esto es intencional: permite testear Product Table Detection y Product Candidate con tablas sintéticas (`tests/test_extraction.py`), sin depender de Docling ni de PDFs reales.

`extract(content, filename)` usa `DocumentConverter().convert(DocumentStream(...))` y aplana cada `TableItem.data.table_cells` (con sus `row_span`/`col_span`) a una grilla `list[list[str]]`.

**Entorno**: el venv del Document Service vive en `C:\venvs\spc-document-service` (fuera del proyecto/OneDrive), no en `document-service/.venv`. Motivo: los paths de licencias de `torch` exceden el límite de 260 caracteres de Windows cuando el venv está anidado bajo la ruta larga de OneDrive — ver skill `performance`/nota de Fase 4. Arrancar con `C:\venvs\spc-document-service\Scripts\python.exe -m uvicorn app.main:app --port 8001` desde `document-service/`.
