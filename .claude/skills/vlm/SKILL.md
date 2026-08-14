---
name: vlm
description: Cuándo y cómo se usa un VLM para resolver ambigüedad de layout que la heurística estructural no resuelve. Usar como último recurso en Product Table Detection.
---

# VLM

## Cuándo se activa

Solo como último recurso en Product Table Detection, cuando la heurística estructural (tipo de dato por columna, posición relativa, patrón de filas) no logra identificar con confianza cuál tabla es la de productos, o cómo se alinean sus columnas.

## Alcance

El VLM interpreta la imagen de la página para resolver la ambigüedad de layout puntual. No reemplaza a Docling/TableFormer como extractor principal — se invoca sobre el caso ambiguo específico, no sobre el documento completo por defecto (costo y latencia).

## Registro

Todo uso de VLM en un `Import` se registra como `ProcessingAttempt` (motor `GRANITE_DOCLING` u otro modelo VLM evaluado) para trazabilidad y comparación en el benchmark.
