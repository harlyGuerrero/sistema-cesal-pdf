# ARCHITECTURE.md

Contexto arquitectónico del sistema de importación de productos desde PDFs/facturas.
Este documento es la fuente de verdad sobre estructura, límites de responsabilidad y modelo de datos conceptual. No contiene código.

## 1. Objetivo del sistema

Importar productos desde PDFs (facturas) mediante un pipeline que:

1. recibe un PDF
2. analiza su estructura
3. detecta la tabla de productos
4. extrae las filas de productos
5. ignora información irrelevante
6. identifica productos
7. clasifica productos
8. solicita revisión humana cuando existe incertidumbre
9. confirma productos
10. guarda productos
11. conserva historial de cada PDF importado

La aplicación expone tres áreas funcionales: **Dashboard**, **Productos**, **Importaciones**.

## 2. Arquitectura de servicios

```
Next.js (app principal)
    |
    | HTTP
    v
Python Document Service
    |
    +-- Docling            (layout + table extraction)
    +-- OCR                (texto en páginas escaneadas / imágenes)
    +-- Table extraction   (TableFormer)
    +-- VLM                (casos ambiguos de layout)
    +-- Ollama              (clasificación semántica, fallback, structured output)
    |
    v
Structured extraction (ProductCandidate[])
    |
    v
Next.js (recibe el resultado estructurado vía HTTP)
    |
    v
Prisma
    |
    v
PostgreSQL
```

Reglas duras de esta separación:

- Next.js es la aplicación principal: UI, routing, persistencia, orquestación de alto nivel.
- Todo el procesamiento documental pesado (Docling, OCR, extracción de tablas, VLM, Ollama) vive en el Python Document Service, un proceso separado.
- La comunicación entre Next.js y el Python Document Service es HTTP. Nunca invocación de proceso local, nunca shared filesystem como contrato.
- **NO** ejecutar Docling directamente desde componentes React.
- **NO** ejecutar OCR desde el frontend.
- **NO** hacer que el frontend procese PDFs.
- El frontend solo sube el PDF y consume resultados estructurados ya validados.

## 3. Pipeline conceptual

```
PDF
 ↓
Document Extraction        (Docling: texto + layout crudo)
 ↓
Layout                     (estructura de página: bloques, regiones)
 ↓
Tables                     (tablas detectadas dentro del layout)
 ↓
Product Table Detection    (¿cuál tabla es la de productos?)
 ↓
Product Rows               (filas crudas de esa tabla)
 ↓
Product Candidate          (fila normalizada: raw text + campos parseados)
 ↓
Relevance Classification   (PRODUCT / CONSUMABLE / SERVICE / OTHER)
 ↓
Patrimonial Classification (una de las 6 categorías, solo si relevance = PRODUCT)
 ↓
Confidence                 (score de la clasificación)
 ↓
Human Review                (si confidence < umbral, o ambigüedad estructural)
 ↓
Confirmation                (usuario confirma o corrige)
 ↓
Persistence                 (Product + ImportItem en PostgreSQL)
```

Principio fundamental: **Extraction != Relevance != Classification != Persistence**. Son etapas con responsabilidades distintas y no deben mezclarse en el mismo módulo, función o servicio. Un cambio en cómo se extrae una tabla no debe requerir tocar código de clasificación, y viceversa.

## 4. Detección estructural, no hardcodeada

El sistema debe entender la estructura del documento a partir de sus propiedades estructurales (layout, posición relativa de columnas, tipos de dato por columna, encabezados detectados), no de reglas específicas por proveedor.

**NO depender de:**

- coordenadas hardcodeadas
- posiciones específicas de página
- nombres de proveedores
- reglas específicas para una factura conocida
- listas enormes de palabras prohibidas

Ejemplo del problema: una tabla de productos puede tener encabezados `CONCEPTO | CANTIDAD | PRECIO | TOTAL`, o `ARTÍCULO | CANT. | P.UNIT | IMPORTE`, o `PRODUCTO | CANTIDAD | VALOR UNITARIO | TOTAL`. La detección de "esta es la tabla de productos" y "esta columna es cantidad" debe basarse en heurísticas estructurales (tipo de dato, posición relativa, repetición de patrón fila a fila) combinadas con clasificación semántica vía VLM/Ollama cuando la heurística estructural no alcanza — nunca en listas fijas de encabezados conocidos.

## 5. Clasificación

### 5.1 Relevancia (no es categoría patrimonial)

```
PRODUCT      → activo físico identificable, candidato a patrimonio
CONSUMABLE   → se agota con el uso (ej. tinta, papel) → se ignora para patrimonio
SERVICE      → no es un bien físico (ej. instalación, flete) → se ignora
OTHER        → no clasificable como los anteriores → se ignora salvo revisión manual
```

Solo los ítems `PRODUCT` avanzan a clasificación patrimonial.

### 5.2 Categorías patrimoniales (exactamente 6, cerradas)

```
EQUIPOS_INFORMATICOS
EQUIPOS_DE_OFICINA
MUEBLES_DE_OFICINA
BIENES_VEHICULARES
EQUIPOS_DE_MAQUINARIA
BIENES_INMUEBLES
```

No existe categoría `OTROS`. Si un `PRODUCT` no encaja con confianza suficiente en ninguna de las 6, va a **Human Review**, no a una categoría cajón de sastre.

## 6. Modelo de datos conceptual

No es un schema Prisma todavía (eso es Fase de base de datos). Es el modelo conceptual que el schema deberá respetar.

### Product

Representa un producto **lógico**, no una línea de una factura. El mismo producto puede aparecer en múltiples importaciones (ej. se vuelve a comprar el mismo modelo de laptop).

- `Product` **no** tiene `importId` como relación obligatoria. Un producto no pertenece a una sola importación.
- La trazabilidad hacia las importaciones es indirecta, vía tabla intermedia:

```
Product
  ↑
ImportItem   (fila concreta detectada en un PDF, referencia a un Product)
  ↑
Import       (el PDF procesado)
```

### Import

Representa cada PDF procesado. Campos conceptuales:

- `filename`
- `fileHash`
- `fileSize`
- `mimeType`
- `status`
- `createdAt`
- `processedAt`
- `completedAt`
- `errorMessage`

Estados:

```
UPLOADED → PROCESSING → READY_FOR_REVIEW → COMPLETED
                                          ↘ FAILED
PROCESSING → FAILED
```

### ImportItem

Cada fila de producto detectada en un PDF se convierte en un `ImportItem`. Es el puente entre lo crudo extraído y el `Product` lógico persistido. Campos conceptuales:

- `rawText`
- `normalizedName`
- `quantity`
- `unitPrice`
- `totalPrice`
- `currency`
- `relevance`
- `category`
- `classificationMethod`
- `confidence`
- `status`
- `reviewNotes`
- `reviewedAt`

### ProcessingAttempt

Registra qué motor procesó cada PDF, para permitir comparar motores y conservar trazabilidad histórica. Ejemplos de motor: `DOCLING`, `GLM_OCR`, `GRANITE_DOCLING`, `OLLAMA`. Un `Import` puede tener múltiples `ProcessingAttempt` (ej. Docling falla en una tabla y se reintenta con VLM).

## 7. Rol de Ollama

Ollama **no** es el parser principal del PDF. Su función:

- clasificación semántica (relevancia, categoría patrimonial) en casos ambiguos
- fallback cuando la heurística estructural no resuelve
- structured output (forzar la respuesta a un esquema conocido)

Ollama **no** se usa para compensar errores de extracción estructural (tablas mal detectadas, columnas mal alineadas). Ese es un problema de la etapa de extracción (Docling/OCR/TableFormer), no de clasificación.

Modelos a evaluar: `GLM-OCR`, `GraniteDocling`, y otros modelos locales si el benchmark demuestra que son superiores. La elección de modelo default se decide con datos de benchmark, no a priori.

## 8. Benchmark permanente

El proyecto mantiene un benchmark con PDFs reales como fixtures, versionado junto al código.

Fixtures iniciales y productos esperados:

| Fixture | Expected products |
|---|---|
| factura-498495.pdf | 4 |
| factura-4165656.pdf | 4 |
| factura-979786546.pdf | 6 |
| factura-9875461.pdf | 4 |

Métricas de extracción:

- `expectedRows`, `detectedRows`, `correctRows`, `missingRows`, `mergedRows`, `extraRows`, `falsePositives`

Métricas de calidad de campo:

- `nameAccuracy`, `quantityAccuracy`, `priceAccuracy`, `totalAccuracy`

Regla: no se afirma precisión general del sistema basándose solo en estos 4 documentos. El benchmark mide regresión y compara motores; no es prueba de generalización.

## 9. Seguridad

Los PDFs son input no confiable. Validación obligatoria antes de cualquier procesamiento:

- MIME type
- extensión de archivo
- tamaño máximo
- firma de archivo PDF (magic bytes, no solo extensión)
- hash (deduplicación + integridad)
- límites de recursos (páginas, tamaño de tabla, etc.)
- timeouts de procesamiento

No se ejecuta contenido embebido del PDF (JavaScript, acciones automáticas, etc.).

## 10. Estado del proyecto

Este documento describe la arquitectura objetivo. El proyecto avanza por fases explícitas (ver `CLAUDE.md`); ninguna fase se ejecuta automáticamente sin confirmación del usuario. Al cierre de la Fase 0, **no existe** todavía: CRUD, Prisma, PostgreSQL, Ollama, Docling, Python service, procesamiento de PDF, clasificación, dashboard ni autenticación. Fase 0 produce únicamente contexto: este archivo, `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`.
