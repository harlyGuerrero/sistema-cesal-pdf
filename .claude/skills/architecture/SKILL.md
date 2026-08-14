---
name: architecture
description: Reglas arquitectónicas de este proyecto — separación Next.js / Python Document Service, límites del pipeline. Usar antes de decidir en qué capa vive código nuevo.
---

# Architecture

Ver `ARCHITECTURE.md` en la raíz para el diagrama completo y el razonamiento. Este skill resume las reglas accionables.

## Separación de servicios

- Next.js: UI, routing, orquestación, persistencia.
- Python Document Service: todo el procesamiento documental pesado (Docling, OCR, tablas, VLM, Ollama).
- Comunicación: HTTP, siempre. Nunca invocar Docling/OCR/Ollama desde código que corre en el proceso de Next.js o en un componente React.

## Separación de etapas del pipeline

Extraction != Relevance != Classification != Persistence. Cada etapa es un módulo/servicio separado con una interfaz de entrada/salida clara (`ProductCandidate` es el contrato entre extracción y clasificación; `ImportItem` confirmado es el contrato hacia persistencia). No agregar lógica de clasificación dentro del código de extracción, ni lógica de persistencia dentro del código de clasificación.

## Señal de alarma

Si una función necesita importar tanto código de Docling/OCR como código de Prisma, está mezclando etapas — dividirla.
