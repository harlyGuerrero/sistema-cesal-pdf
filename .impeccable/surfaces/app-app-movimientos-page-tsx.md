---
version: 1
slug: "app-app-movimientos-page-tsx"
primary_target: "app/(app)/movimientos/page.tsx"
related_targets: ["app/(app)/auditoria/page.tsx","app/(app)/activos/[id]/page.tsx"]
---

# Historial: Movimientos, historial del activo y Auditoría

Modo: Operate. Superficies: `/movimientos`, sección de historial en `/activos/[id]` (y versión imprimible en `/activos/[id]/ficha`), `/auditoria`.

Audiencia: cualquier empleado de CESAL, no solo el equipo de logística. Tarea: entender de un vistazo qué pasó, a qué activo o registro, quién lo hizo y cuándo, sin leer etiquetas técnicas. Fidelidad a los datos: nada se infiere que no esté guardado.

Restricciones: mundo visual de DESIGN.md sin cambios; mismas consultas, filtros, exportación y paginación; sin cambios de esquema.

## Direction contract

THESIS: Un historial es un libro de inventario que se lee en frases: una tabla conocida donde la primera columna dice en castellano llano qué pasó. Rechaza la tabla de columnas técnicas (Movimiento, Detalle, Antes/Después en recuadros) y también la línea de tiempo decorada.

OWN-WORLD: El de DESIGN.md: Papel y Tinta, Azul CESAL como única tinta de acción, chip tintado al 15% por tipo con su ícono de `*_META`, tarjetas en capas suaves, texto 14px, números tabulares, filas de 1px.

STORY: El empleado busca un activo o filtra por persona y fecha, lee la frase de cada fila («Activo asignado a Sergio»), ve el activo y quién lo registró, y abre la fila solo si necesita el antes/ahora campo por campo.

FIRST VIEWPORT: Título y descripción con Exportar a la derecha; tarjeta de filtros en una fila (buscar, registrado por, sede/fechas, Limpiar); tarjeta de tabla con pestañas por tipo con su conteo arriba, luego columnas Qué pasó (≈44%) · Activo · Registrado por · Fecha ordenable · chevron. La fila abierta muestra una rejilla Antes / Ahora.

FORM: Tabla legible con frase, posición 6 de 7 en la lista ordenada; seed:57e9498b60801615.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
