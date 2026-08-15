@AGENTS.md

# CLAUDE.md

Sistema de importación de productos desde PDFs/facturas. Lee `ARCHITECTURE.md` antes de tocar cualquier parte del pipeline o del modelo de datos — este archivo no repite esa información, solo apunta a ella y fija reglas de trabajo.

## Cómo trabajamos: fases

El proyecto avanza por fases explícitas. **No se avanza a la siguiente fase automáticamente.** Cada fase se cierra con una revisión y espera confirmación explícita del usuario antes de continuar.

- **Fase 0 (actual):** contexto arquitectónico. Solo `CLAUDE.md`, `ARCHITECTURE.md`, `.claude/agents/`, `.claude/skills/`. Sin código de negocio.
- Fases siguientes (no iniciar sin confirmación): schema de datos/Prisma, Python Document Service, pipeline de extracción, clasificación, UI de dashboard/productos/importaciones, autenticación.

Si no está claro en qué fase estamos, preguntar antes de escribir código.

## Regla fundamental de Fase 0

Al cierre de Fase 0 **no debe existir** implementación de: CRUD, Prisma, PostgreSQL, Ollama, Docling, Python service, procesamiento de PDF, clasificación, dashboard, autenticación. Fase 0 es solo documentación de arquitectura, agentes y skills.

## Stack (detalle en skills, no lo dupliques aquí)

Frontend: Next.js (App Router — **no** React Router), React, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, Lucide.
Base de datos: PostgreSQL + Prisma 7.
Procesamiento documental: servicio Python separado (Docling, TableFormer, OCR, VLM).
IA local: Ollama (`GLM-OCR`, `GraniteDocling`, evaluados por benchmark).
Testing: Vitest, Playwright.

## Reglas que no se negocian

Estas reglas vienen de decisiones arquitectónicas explícitas — ver `ARCHITECTURE.md` para el razonamiento completo.

1. **Separación de servicios**: el procesamiento documental pesado (Docling/OCR/VLM/Ollama) vive en el Python Document Service, nunca en el frontend ni en componentes React. Comunicación Next.js ↔ Python es HTTP.
2. **Separación de etapas del pipeline**: Extraction != Relevance != Classification != Persistence. No mezclar estas responsabilidades en el mismo módulo.
3. **Detección estructural**: nunca coordenadas hardcodeadas, nombres de proveedores, reglas por factura específica, ni listas enormes de palabras prohibidas.
4. **Un Activo es una unidad física, no un catálogo compartido**: `Product` se fusionó con el módulo patrimonial y pasó a llamarse `Activo` (Fase 1 de Activos). Ya no se deduplica por nombre — confirmar un `ImportItem` crea un `Activo` nuevo por cada unidad física (`quantity` en la fila desdobla en N activos). La relación se invirtió respecto al viejo `Product ← ImportItem`: ahora es `Activo → ImportItem` (`Activo.importItemId`, opcional — un Activo puede nacer de una importación o crearse manualmente), y varios `Activo` pueden apuntar al mismo `ImportItem`.
5. **Categorías patrimoniales cerradas**: exactamente 6 (`EQUIPOS_INFORMATICOS`, `EQUIPOS_DE_OFICINA`, `MUEBLES_DE_OFICINA`, `BIENES_VEHICULARES`, `EQUIPOS_DE_MAQUINARIA`, `BIENES_INMUEBLES`), modeladas como `TipoActivo`/`TipoActivoCode`. Nunca crear `OTROS`. La relevancia (`PRODUCT`/`CONSUMABLE`/`SERVICE`/`OTHER`) es un concepto distinto y no es un tipo de activo.
6. **Ollama no es el parser principal**: solo clasificación semántica, ambigüedad, fallback y structured output. No se usa para tapar errores de extracción estructural.
7. **PDFs son input no confiable**: validar MIME, extensión, tamaño, firma de archivo, hash, límites y timeouts antes de procesar. Nunca ejecutar contenido del PDF.

## Estructura de contexto

```
CLAUDE.md              — este archivo: reglas de trabajo y punteros
ARCHITECTURE.md         — arquitectura, pipeline, modelo de datos conceptual, benchmark
.claude/agents/          — agentes especializados (architect, document-ai-specialist,
                            classification-specialist, database-specialist, reviewer)
.claude/skills/          — reglas específicas de este proyecto por tema, sin duplicar
                            documentación general de las tecnologías
```

Al escribir o actualizar un skill: solo reglas específicas de este proyecto, no documentación completa de la tecnología subyacente, no duplicar contenido entre skills.

## Notas sobre el repositorio

Este directorio ya contiene un scaffold estándar de `create-next-app` (Next.js 16, React 19, Tailwind 4, shadcn inicializado vía `components.json`) sin código de negocio todavía. `AGENTS.md` en la raíz es autogenerado y reescrito por `next dev` — no editarlo a mano, no es el lugar de las reglas de este proyecto (esas van en este archivo y en `.claude/`).
