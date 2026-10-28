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
Patrimonial Classification (una de las 7 categorías, solo si relevance = PRODUCT)
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

### 5.2 Tipos de activo / categorías patrimoniales (exactamente 7, cerradas)

Modeladas como `TipoActivo`/`TipoActivoCode` en el schema (antes `Category`/`CategoryCode` — mismo dato, tabla renombrada al fusionarse `Product` con el módulo patrimonial de Activos).

```
EDIFICACIONES                       Edificaciones
VEHICULOS_Y_MEDIOS_DE_TRANSPORTE    Vehículos y medios de transporte
EQUIPOS_INFORMATICOS                Equipos informáticos
EQUIPOS_DE_OFICINA                  Equipos de oficina
ACTIVOS_INTANGIBLES_INFORMATICOS    Activos intangibles informáticos
MAQUINARIA_Y_EQUIPOS                Maquinaria y equipos
MOBILIARIO_Y_ENSERES                Mobiliario y enseres
```

No existe categoría `OTROS`. Si un `PRODUCT` no encaja con confianza suficiente en ninguna de las 7, va a **Human Review**, no a una categoría cajón de sastre.

`ACTIVOS_INTANGIBLES_INFORMATICOS` (licencias perpetuas, sistemas a medida) no es una unidad física: se registra como Activo igual (sede/ubicación son opcionales), pero la relevancia sigue marcando LICENCIA/SUSCRIPCIÓN como `SERVICE`, así que no se clasifica automáticamente desde una factura — se asigna a mano.

## 6. Modelo de datos conceptual

No es un schema Prisma todavía (eso es Fase de base de datos). Es el modelo conceptual que el schema deberá respetar.

### Activo (antes Product)

Desde la planificación del módulo patrimonial de Activos Fijos, `Product` se fusionó con `Activo`: no son dos entidades enlazadas, es la misma tabla. Un `Activo` representa una **unidad física individual** — no un catálogo lógico compartido entre compras. Comprar 5 laptops del mismo modelo genera 5 `Activo` distintos, cada uno con su propio código patrimonial, ubicación y responsable a asignar (ver planificación de Activos, decisión "Product se fusiona en Activo" + "1 Activo por unidad").

- `Activo.importItemId` es **opcional**: puede nacer de una fila de importación confirmada, o crearse manualmente (alta directa, migración de inventario histórico).
- Confirmar un `ImportItem` **ya no busca ni reutiliza** un `Activo` existente por nombre — siempre crea fila(s) nueva(s). Si la fila tiene `quantity > 1`, se crea un `Activo` por unidad.
- La relación quedó invertida respecto al viejo `Product ← ImportItem`: varios `Activo` pueden apuntar al mismo `ImportItem` de origen.

```
Activo (0..N por fila, según quantity)
  ↓ importItemId (opcional)
ImportItem   (fila concreta detectada en un PDF)
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

### Depreciación (Fase 58)

Depreciación lineal trimestral sobre `Activo.costoAdquisicion`, valor residual S/ 0,00. Empieza en el trimestre calendario de `fechaAdquisicion` con la tasa trimestral completa; cada trimestre deprecia `costo × tasa trimestral` (sobre el costo, no sobre el saldo) y el último solo el saldo pendiente. El motor es puro y vive en `lib/depreciacion/calculo.ts`: montos en centavos enteros, redondeo half-up por periodo.

- `TasaDepreciacion`: tasa **anual** por `TipoActivo` (sembrada con las tasas oficiales de CESAL). La trimestral se deriva como anual / 4 en un solo lugar (`lib/depreciacion/tasas.ts`). Un tipo sin tasa activa es "configuración pendiente" y sus activos no se deprecian.
- `DepreciacionPeriodo`: instantánea inmutable por activo y trimestre (costo base, tasa aplicada, importe, acumulado, valor neto), única por `(activoId, anio, trimestre)`. Los periodos se registran en orden y sin huecos desde el trimestre de adquisición, así el acumulado siempre es verificable como la suma de los importes.
- `ProcesamientoDepreciacion`: cada ejecución de "Procesar trimestre" (quién, hasta qué trimestre, resultado), auditada en `AuditoriaLog` como `PROCESAR_DEPRECIACION`.

Procesar el trimestre P registra, para cada activo, todos los trimestres que le falten hasta P (activos cargados tarde incluidos). Es idempotente: un periodo ya registrado nunca se recalcula ni se duplica. Corre en una sola transacción con un lock consultivo, todo o nada. No se deprecian activos sin costo o fecha válidos (pendientes de revisión), ni activos dados de baja; un activo totalmente depreciado sigue en el patrimonio con su costo e historial y valor neto 0. Con depreciación registrada, el costo, la fecha y el tipo de un activo quedan fijos y el activo no se puede eliminar.

El estado de depreciación (`PENDIENTE_REVISION`, `CONFIGURACION_PENDIENTE`, `PENDIENTE_DEPRECIACION`, `EN_DEPRECIACION`, `TOTALMENTE_DEPRECIADO`) no es una columna: se deriva de los datos del activo más su historial. El módulo `/depreciacion` y la sección del detalle del activo usan el mismo resumen, así que el valor neto coincide entre ambos.

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
