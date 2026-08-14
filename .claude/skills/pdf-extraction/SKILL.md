---
name: pdf-extraction
description: Reglas de la etapa Product Table Detection → Product Rows → Product Candidate — cómo pasar de tablas crudas a filas de producto normalizadas. Usar al implementar esta parte específica del pipeline.
---

# PDF Extraction (Product Table Detection → Product Candidate)

Cubre la parte del pipeline entre "tablas detectadas por Docling" y "ProductCandidate normalizado". No cubre la extracción de tablas en sí (`docling`) ni la clasificación (`product-classification`).

## Product Table Detection

De todas las tablas que Docling detecta en un documento, identificar cuál es la tabla de productos usando señales estructurales:

- tipo de dato dominante por columna (numérico vs texto vs moneda)
- posición relativa de columnas típicas de una tabla de ítems (descripción, cantidad, precio, total)
- repetición de patrón fila a fila
- encabezados detectados semánticamente, sin lista fija de encabezados conocidos

Un documento puede tener tablas que no son de productos (ej. datos del emisor, totales, condiciones de pago) — deben descartarse por estructura, no por posición en la página.

## Product Rows → Product Candidate

Cada fila de la tabla de productos se normaliza a `ProductCandidate`: conserva el `rawText` original de la fila y separa los campos parseados (`normalizedName`, `quantity`, `unitPrice`, `totalPrice`, `currency`). Si un campo no se puede parsear con confianza, se conserva `null` en ese campo en vez de forzar un valor — la ambigüedad se resuelve después, en clasificación/revisión, no inventando datos aquí.

## Regla dura

Nunca usar coordenadas de página hardcodeadas ni reglas específicas de un proveedor para decidir qué fila es un producto.

## Implementación (Fase 4)

Todo en `document-service/app/extraction/`, independiente de Docling (ver skill `docling`):

- `column_stats.py` — estadísticas por columna (`numeric_ratio`, `avg_value`, `avg_text_len`, `integer_ratio`) sobre las filas de datos. Base de todo lo demás.
- `table_detection.py` — `select_product_table`: puntúa cada tabla por (nº filas de datos) × (1 + nº columnas numéricas), exigiendo al menos una columna descriptiva (numeric_ratio bajo, texto largo) y una numérica. La tabla con mayor puntaje gana; si ninguna califica, no hay tabla de productos.
- `column_roles.py` — `assign_column_roles`: identifica cantidad/precio unitario/total probando qué combinación de columnas numéricas satisface `cantidad × precioUnitario ≈ total` en más filas (tolerancia relativa 2%), no por posición ni por texto de encabezado. Con 2 columnas numéricas o 1, aplica mejor esfuerzo (ver docstring); nunca fuerza `quantity`.
- `product_candidate.py` — `rows_to_candidates`: una fila solo se vuelve `ProductCandidate` si tiene `quantity` parseable y positivo, al menos un precio (`unitPrice` o `totalPrice`), y descripción no vacía. Esto es lo que filtra IBAN/NIF/Notas/Subtotal/IVA/IRPF **sin lista de palabras prohibidas** — esas filas no tienen una cantidad positiva en la columna de cantidad detectada. `confidence` sube a 0.95 cuando `cantidad × unitario ≈ total` cuadra, baja a 0.6 si no cuadra, 0.75 si solo hay un precio.

Cobertura de regresión en `document-service/tests/test_extraction.py` — reproduce los ejemplos exactos de esta fase (MONITOR TEROS aceptado; IBAN/NIF/Notas/Subtotal/IVA/IRPF rechazados) y prueba con encabezados distintos para confirmar que la detección no depende del texto del encabezado.

**Limitación conocida**: sin los PDFs fixture reales todavía (pendientes de subir), esta lógica está validada con tablas sintéticas, no con las facturas reales del benchmark. Ajustar umbrales (`NUMERIC_COLUMN_RATIO_MIN`, `RELATIVE_TOLERANCE`) cuando lleguen los fixtures reales en Fase 14 si el benchmark lo pide.

**Bug real encontrado y corregido en Fase 9**: `column_stats.py` usaba `parse_number` (permisivo, extrae dígitos aunque estén mezclados con letras) para decidir si una celda cuenta como "numérica" al tipar columnas. Un nombre de producto con modelo ("LAPTOP DELL LATITUDE 5420", "ESTABILIZADOR DE VOLTAJE 2000VA") hacía que la columna de descripción pareciera ~50% numérica, perdía la calificación de "columna descriptiva" y la tabla entera se descartaba (`score_product_table` devolvía 0). Fix: `parsing.py` ahora tiene `is_numeric_cell` (estricta — la celda debe SER un número, con decoración de moneda conocida como prefijo/sufijo, no simplemente contener dígitos) para `numeric_ratio` y `row_numeric_density`; `parse_number` sigue siendo el usado para extraer el *valor* una vez que ya se sabe que la columna es numérica (`product_candidate.py`, `column_roles.py`'s scoring de triples). No usar `parse_number` para clasificar columnas — usar `is_numeric_cell`. Regresión cubierta en `test_extraction.py` (`test_is_numeric_cell_distinguishes_numbers_from_text_containing_digits`, `test_detects_product_table_with_model_numbers_in_description`).
