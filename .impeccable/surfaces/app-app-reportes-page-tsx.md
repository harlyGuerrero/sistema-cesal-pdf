---
version: 1
slug: "app-app-reportes-page-tsx"
primary_target: "app/(app)/reportes/page.tsx"
related_targets: []
---

# Reportes

Modo: Operate. Superficie: `/reportes` (pantalla, impresión y exportación a Excel con el mismo peso).

Audiencia y tareas: dirección (cuánto patrimonio hay, dónde y de qué tipo), auditoría externa (evidencia ordenada) y consultas diarias («¿cuántos equipos informáticos hay en Huachipa?»). Montos: costo de adquisición y valor neto contable calculado por el módulo de depreciación; ya no el campo manual «valor contable».

Restricciones: mundo visual de DESIGN.md sin cambios; mismos filtros (sede con desglose a unidad operativa, tipo, estado); pantalla, impresión y Excel muestran lo mismo.

## Direction contract

THESIS: El reporte es una matriz sede × tipo que se interroga: cada cifra es una puerta a los activos que cuenta. Rechaza el reporte de tarjetas de indicadores más tablas sueltas sin relación entre sí.

OWN-WORLD: El de DESIGN.md: Papel y Tinta, Azul CESAL como única tinta de acción (celdas enlazables subrayadas en azul, celda elegida con tinte azul y contorno), colores fijos por tipo de activo de TIPO_ACTIVO_META, números tabulares, filas de 1px, tarjetas en capas suaves.

STORY: El usuario fija sede, tipo o estado; lee de un vistazo cantidad, costo y valor neto; toca una celda (o un total de fila o de columna) y debajo aparece exactamente esa lista de activos con su valor; imprime o exporta lo mismo que ve.

FIRST VIEWPORT: Título y descripción con Imprimir y Exportar a la derecha; una franja con Activos · Costo de adquisición · Valor neto contable · Corte de la depreciación; filtros; la matriz con las 7 columnas de tipos, Total, Costo y Valor neto, fila de totales; debajo, la tarjeta del desglose titulada con la celda elegida.

FORM: Matriz con desglose, posición 2 de 7 en la lista ordenada; seed:05dbdbe18b017ea3.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
