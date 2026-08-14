---
name: ocr
description: Cuándo y cómo se usa OCR en el pipeline de extracción. Usar al implementar el fallback de texto para páginas escaneadas o regiones sin capa de texto.
---

# OCR

## Cuándo se activa

Solo cuando Docling no encuentra capa de texto extraíble en una página o región (páginas escaneadas, imágenes). No correr OCR sobre páginas que ya tienen texto extraíble — es más lento y más propenso a error que texto nativo.

## Alcance

OCR entrega texto plano de la región afectada, que vuelve a entrar al flujo de layout/tablas de Docling. OCR no decide estructura de tabla por sí mismo.

## Calidad

El resultado de OCR se trata como más incierto que texto nativo: al calcular `confidence` de un `ProductCandidate`, si su texto proviene de OCR eso debe reflejarse (menor confianza base), no tratarse igual que texto extraído nativamente.
