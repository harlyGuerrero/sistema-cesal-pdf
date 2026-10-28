---
name: Sistema Patrimonial CESAL
description: Registro oficial de los activos fijos de CESAL — sobrio como un libro de inventario, cálido como la institución.
colors:
  azul-cesal: "#2a78d6"
  azul-cesal-noche: "#3987e5"
  tinta: "oklch(0.145 0 0)"
  tinta-suave: "oklch(0.556 0 0)"
  papel: "oklch(1 0 0)"
  papel-gris: "oklch(0.97 0 0)"
  linea: "oklch(0.922 0 0)"
  noche-fondo: "#0d0d0d"
  noche-tarjeta: "#1a1a19"
  brillo-azul: "#006ba6"
  brillo-amarillo: "#e5e600"
  rojo-error: "oklch(0.577 0.245 27.325)"
  estado-disponible: "#0ca30c"
  estado-mantenimiento: "#fab219"
  estado-baja: "#d03b3b"
  estado-neutro: "#898781"
  serie-1-azul: "#2a78d6"
  serie-2-naranja: "#eb6834"
  serie-3-aguamarina: "#1baf7a"
  serie-4-ambar: "#eda100"
  serie-5-rosa: "#e87ba4"
  serie-6-verde: "#008300"
  serie-7-negro: "#171717"
typography:
  headline:
    fontFamily: "system-ui, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.4
  title:
    fontFamily: "system-ui, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "system-ui, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "system-ui, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  stat:
    fontFamily: "system-ui, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    fontFeature: "\"tnum\""
  mono:
    fontFamily: "\"Geist Mono\", ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  full: "9999px"
spacing:
  control-x: "10px"
  card: "16px"
  card-sm: "12px"
  section: "20px"
  page: "24px"
components:
  button-primary:
    backgroundColor: "{colors.azul-cesal}"
    textColor: "{colors.papel}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
    typography: "{typography.body}"
  button-outline:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-outline-hover:
    backgroundColor: "{colors.papel-gris}"
  input:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
  card:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card}"
  form-section:
    rounded: "{rounded.xl}"
    padding: "{spacing.section}"
  nav-item-active:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.azul-cesal}"
    rounded: "{rounded.xl}"
  history-tab:
    textColor: "{colors.tinta-suave}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "32px"
    typography: "{typography.body}"
  history-tab-active:
    backgroundColor: "color-mix(in oklch, #2a78d6 10%, transparent)"
    textColor: "{colors.azul-cesal}"
  matrix-cell-link:
    textColor: "{colors.azul-cesal}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
    typography: "{typography.body}"
  matrix-cell-selected:
    backgroundColor: "color-mix(in oklch, #2a78d6 10%, transparent)"
    textColor: "{colors.azul-cesal}"
    rounded: "{rounded.md}"
---

# Design System: Sistema Patrimonial CESAL

## Overview

**Creative North Star: "El Libro de Inventario"**

El sistema es el registro oficial del patrimonio de CESAL, y se ve como tal: un libro de inventario bien llevado, donde cada bien tiene su línea, su código y su historia, y nada queda suelto. La estructura manda. Tablas con jerarquía clara, secciones agrupadas con su propio borde, números tabulares y alineados. El color nunca decora: identifica (qué tipo de bien es, en qué estado está, qué rol tiene un usuario).

Sobre esa sobriedad va una capa cálida e institucional. El fondo del modo claro lleva el brillo azul y amarillo de CESAL en las esquinas, y las tarjetas flotan sobre él en capas suaves. Así la herramienta se siente propia de la organización y no un software genérico. Los controles son amables y claros: estados de hover y foco visibles, etiquetas siempre presentes, íconos que acompañan al texto. Lo usa a diario un equipo administrativo, no especialistas técnicos.

La densidad es la de una herramienta de trabajo de escritorio: controles compactos de 32px, texto base de 14px y mucha información por pantalla. Todo debe seguir funcionando en un celular durante el inventario físico.

**Key Characteristics:**
- Un único acento, el Azul CESAL, para acción, foco y navegación activa.
- Color de identidad por valor cerrado (tipo de activo, estado patrimonial, rol), siempre acompañado de ícono y texto.
- El chip tintado: ícono de color sobre un fondo del mismo color al 15%.
- Tarjetas en capas suaves sobre un fondo con el brillo de marca.
- Tipografía del sistema operativo, números tabulares y formato `es-PE`.
- Modo oscuro propio, no una inversión automática, y una impresión que siempre sale en claro.

## Colors

Una base neutra de papel y tinta, un solo azul institucional y dos familias de color con función: los estados y la paleta de series para gráficos.

### Primary
- **Azul CESAL** (#2a78d6; en oscuro, Azul CESAL Noche #3987e5): botones principales, enlaces, anillo de foco, ítem activo del menú lateral, íconos de navegación activa y la primera serie de los gráficos. Es el único color de acción del sistema.

### Neutral
- **Tinta** (oklch(0.145 0 0)): texto principal y títulos.
- **Tinta Suave** (oklch(0.556 0 0)): descripciones, etiquetas de campo, ayudas, valores secundarios en leyendas.
- **Papel** (oklch(1 0 0)): tarjetas, popovers, campos, menú lateral.
- **Papel Gris** (oklch(0.97 0 0)): hover de botones secundarios y filas, fondos "muted", fila seleccionada en leyendas.
- **Línea** (oklch(0.922 0 0)): bordes de campos, divisores, bordes de sección.
- **Noche** (fondo #0d0d0d, tarjeta #1a1a19): el modo oscuro usa superficies sólidas propias, sin el brillo de marca.

### Brillo de marca
- **Brillo Azul** (#006ba6 al ~12%) y **Brillo Amarillo** (#e5e600 al ~16%): dos glows radiales en las esquinas superior izquierda e inferior derecha del fondo de la app, sobre un degradado casi blanco (#f9fcff → #f4f9fb → #fffef4). Solo en modo claro y solo en el fondo de página. Nunca en componentes.

### Estados (fijos en claro y oscuro)
- **Disponible** (#0ca30c), **Mantenimiento** (#fab219), **Baja** (#d03b3b), **Neutro** (#898781). Asignado usa el Azul CESAL. Representan el estado patrimonial y nada más.
- **Rojo Error** (oklch(0.577 0.245 27.325)): errores de validación y acciones destructivas.

### Series de gráficos
Siete slots en orden fijo, uno por tipo de activo oficial: **Azul** #2a78d6, **Naranja** #eb6834, **Aguamarina** #1baf7a, **Ámbar** #eda100, **Rosa** #e87ba4, **Verde** #008300 y **Negro** #171717. El negro es para Mobiliario y enseres, por decisión del usuario. En oscuro, cada slot tiene su propio paso: el negro pasa a gris claro (#d4d4d4). Los slots 1 a 6 están validados con el script de la skill dataviz.

### Named Rules
**The Single Ink Rule.** El Azul CESAL es el único color de acción. Un botón, enlace o foco nunca usa otro tono.

**The Color Means Something Rule.** Todo color fuera de la base neutra codifica un valor cerrado (tipo, estado, rol o serie) y va siempre con ícono y texto. Si un color no responde a "¿qué dato representa?", sobra.

**The Reserved Status Rule.** Verde, ámbar y rojo de estado no se reusan como color de tipo, de sección ni de serie. Mezclarlos confundiría "qué es" con "cómo está".

## Typography

**Body Font:** system-ui (con "Segoe UI", Roboto, sans-serif)
**Mono Font:** Geist Mono, solo para datos tabulares o códigos que lo pidan.

**Character:** la letra del sistema operativo, como en un formulario oficial bien impreso. Es familiar, legible y no llama la atención. La jerarquía sale del peso y del tamaño, no de una tipografía de display.

### Hierarchy
- **Headline** (500, 1.25rem/20px): título de cada página ("Dashboard", "Tipos de Activo"), siempre con una descripción breve en Tinta Suave debajo.
- **Title** (600, 1rem/16px): títulos de tarjeta en el dashboard. En formularios, el título de sección baja a 14px semibold.
- **Body** (400, 0.875rem/14px): texto general, celdas de tabla, campos (16px en móvil para evitar el zoom de iOS).
- **Label** (500, 0.75rem/12px): etiquetas de filtros y de stat cards, metadatos y leyendas.
- **Stat** (600, 1.5rem/24px, numerales tabulares): cifras grandes de los stat cards y del centro de la dona.

### Named Rules
**The Tabular Rule.** Toda cifra que se compara (cantidades, porcentajes, montos, códigos) usa numerales tabulares y se formatea con `toLocaleString("es-PE")`.

**The No Display Font Rule.** No hay tipografía de titulares aparte. Un título se distingue por peso y tamaño, nunca por una fuente decorativa.

## Layout

- **Estructura general:** un menú lateral colapsable a la izquierda (grupos: Principal, Configuración de Activos, Organización) y el contenido en `<main>` con 24px de padding y 24px entre bloques.
- **Encabezado de página:** título y descripción alineados a la izquierda. Las acciones van a la derecha o en una barra de filtros debajo.
- **Dashboard:** una fila de 5 stat cards (1 columna en móvil, 2 en sm, 5 en lg) y luego una grilla de 3 tarjetas (1 columna en móvil, 3 en lg). Las tablas de recientes ocupan el ancho completo.
- **Filtros:** en una sola fila sobre la tabla, en grilla de 1 a 4 columnas, con etiqueta de 12px sobre cada control. Los botones Filtrar y Limpiar van al final.
- **Formularios largos:** se agrupan en FormSections (borde propio, 20px de padding, 16px entre campos) dentro de una grilla de 2 columnas desde sm.
- **Fichas de detalle:** contenedor centrado de hasta 768px, con radio de 18px.
- **Densidad:** los controles miden 32px de alto. El ritmo base es de 4px (gap-2 = 8px entre elementos relacionados, gap-4 = 16px entre grupos).

## Elevation & Depth

El sistema usa capas suaves. Las superficies se separan del fondo con brillo de marca por dos medios: un anillo fino (1px de Tinta al 10%) y, en contenedores principales y en el ítem activo del menú, una sombra corta y difusa. Los elementos flotantes (menús, selects, popovers) suben un nivel con una sombra más marcada. Los diálogos son el nivel más alto.

### Shadow Vocabulary
- **Reposo** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): todas las tarjetas, fichas de detalle, contenedores de formulario e ítem activo del menú lateral.
- **Flotante** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): menús desplegables, selects, combobox, popovers y tooltips.
- **Modal** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): diálogos.

### Named Rules
**The Paper Stack Rule.** La profundidad es la de hojas apiladas: sombras cortas y neutras, nunca de color, nunca con glow. Si una sombra se nota antes que el contenido, es demasiado fuerte.

**The Print Is Flat Rule.** Al imprimir no hay sombras, fondos ni modo oscuro: solo blanco, bordes y texto.

## Shapes

- **Esquinas:** suavemente redondeadas, con un radio base de 10px. Los controles (botones, campos, selects) usan 10px. Las tarjetas y FormSections usan 14px y las fichas de detalle 18px.
- **Elementos pequeños:** los chips de ícono usan 6–8px. Los puntos de leyenda y los avatares son circulares.
- **Bordes:** siempre finos (1px) y neutros.
- **Única excepción:** el ítem activo del menú lateral lleva un borde izquierdo azul de 5px, como un marcador de página.

**The Bookmark Rule.** El único borde grueso del sistema es el marcador azul del menú lateral. Ningún otro elemento usa bordes de acento de más de 1px.

## Components

### Buttons
Amables y claros: compactos, con el texto siempre presente y el estado siempre visible.
- **Shape:** esquinas suaves (10px), 32px de alto, 10px de padding horizontal, texto de 14px en 500.
- **Primary:** fondo Azul CESAL y texto blanco. En hover baja al 80%.
- **Outline:** fondo Papel con borde Línea. En hover pasa a Papel Gris. Es la acción secundaria por defecto (Cancelar, Ver todos, Limpiar).
- **Ghost / Destructive:** sin fondo en reposo. El destructivo usa rojo al 10% de fondo y texto rojo, nunca rojo sólido.
- **Focus:** anillo de 3px en Azul CESAL al 50%. Al hacer clic, el botón baja 1px.
- **Íconos:** de 16px, a la izquierda del texto. Un botón solo de ícono necesita `aria-label`.

### Chips de identidad (badges)
- **Style:** el chip tintado. Fondo del color de identidad al 15% (`color-mix(in oklch, <color> 15%, transparent)`), con ícono y texto en ese color o en Tinta.
- **Uso:** estado patrimonial, tipo de activo, rol de usuario, estado de importación y tipo de movimiento. Cada valor cerrado tiene un ícono y un color fijos, definidos en un mapa `*_META`.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** Papel (Noche Tarjeta en oscuro).
- **Shadow Strategy:** anillo de 1px de Tinta al 10% más la sombra Reposo, ya incluida en el componente Card (ver Elevation & Depth).
- **Internal Padding:** 16px (12px en la variante sm).
- **Header:** título de 16px semibold con una descripción opcional en Tinta Suave. La acción de la tarjeta (enlace "Ver todos", selector) va en `CardAction`, alineada arriba a la derecha; nunca con `flex-row` sobre el header, que es una grilla.

### Inputs / Fields
- **Style:** borde Línea de 1px, fondo transparente, 32px de alto, esquinas de 10px y placeholder en Tinta Suave.
- **Focus:** el borde pasa a Azul CESAL, con un anillo de 3px al 50%.
- **Error:** borde Rojo Error, con anillo rojo al 20% y mensaje debajo.
- **Disabled:** opacidad del 50%. Los valores generados por el sistema (código patrimonial) se muestran en un campo de solo lectura con fondo gris, o con borde punteado si todavía no existen.
- **Combobox:** las listas largas con jerarquía (subcategorías) usan un combobox con búsqueda y grupos rotulados por "Tipo · Categoría".

### Navigation
- **Menú lateral:** fondo Papel, ítems de 14px semibold con ícono de 16px y radio de 14px, agrupados con un rótulo de 12px.
- **Hover:** fondo Papel Gris.
- **Activo:** fondo Papel, texto e ícono Azul CESAL, sombra Reposo y el marcador izquierdo de 5px en Azul CESAL (en claro y oscuro).
- **Móvil:** el menú lateral se abre como un panel deslizante.

### Stat Card (firma)
Etiqueta de 12px en Tinta Suave, cifra de 24px semibold tabular y una pista de 12px debajo (por ejemplo, "67% del total"). A la derecha, un chip tintado circular de 36px con el ícono del estado. Es la forma estándar de presentar un indicador.

### FormSection (firma)
Un bloque de formulario con borde propio (14px de radio, 20px de padding). En la cabecera lleva un chip tintado de 28px con el ícono de la sección y un título de 14px semibold. El color de la sección solo sirve para distinguir unas secciones de otras: no codifica datos.

### Gráficos
Son de shadcn (`ChartContainer`) sobre recharts, con los colores de la serie por tipo de activo en orden fijo. Tienen tooltip al pasar el mouse, y una leyenda con valor y porcentaje cuando hay dos o más series. El elemento destacado (barra o sector) se marca con un contorno punteado o un anillo exterior, nunca con un color distinto.

### Tabla de historial legible (firma)
Un historial (Movimientos, historial del activo y Auditoría) es una tabla que se lee en frases, no una tabla de columnas técnicas ni una línea de tiempo decorada.
- **Primera columna, la frase:** "Qué pasó" ocupa cerca del 44% del ancho (58% cuando no hay columna Activo). Lleva el chip tintado circular de 28px con el ícono del tipo, la frase en 14px medium, la categoría en 12px Tinta Suave y, si hace falta, una o dos líneas de resumen en Tinta Suave. La frase solo dice lo que el registro guardó.
- **Columnas fijas:** Activo (nombre enlazado, código en mono de 12px, ubicación de hoy), Registrado por y Fecha (fecha tabular con la hora debajo en 12px). El encabezado Fecha es un enlace que alterna el orden y muestra la flecha del sentido actual.
- **Pestañas con conteo:** encima de la tabla, una pestaña por tipo con su ícono de color y la cantidad tabular en `es-PE`. Miden 32px de alto, con esquinas de 10px y 12px de padding horizontal. La activa lleva fondo Azul CESAL al 10% y texto azul medium; las demás van en Tinta Suave, con hover Papel Gris. Son enlaces: el filtro vive en la URL. En móvil se deslizan en horizontal.
- **Fila expandible:** toda la fila abre el detalle (un enlace dentro de ella navega y no abre). Al final, un chevron azul de 28px con `aria-expanded` gira 180° al abrir. La fila abierta y su detalle comparten el fondo Papel Gris al 40%.
- **Rejilla Antes / Ahora:** columnas acotadas (etiqueta de 8rem y dos valores de hasta 16rem, máximo 768px) para que el antes y el ahora queden cerca aunque la tabla sea ancha. Los campos que cambiaron van en medium; los demás, en Tinta Suave con "(sin cambios)". Si no hay situación anterior (un alta), queda una sola columna, "Registrado". Debajo van los pares etiqueta/valor (Motivo, Observaciones, Fecha exacta) con la misma columna de etiqueta de 8rem.
- **Móvil (menos de 768px):** la tabla deja de ser tabla. Se oculta el encabezado y cada fila se apila: la frase con el chevron en la primera línea y, debajo, con sangría de 40px, el activo, quién y cuándo en 12px Tinta Suave ("Registrado por …", fecha · hora).
- **Movimiento:** el detalle se despliega corto (200ms ease-out, aparece y baja 4px) y sin animación con `prefers-reduced-motion`. Es el único movimiento del historial.
- **Paginación y vacío:** "Mostrando X a Y de Z" con botones de 32px (la página actual en Azul CESAL sólido). El estado vacío distingue "todavía no hay nada" de "el filtro no encontró", con un círculo de 40px en Papel Gris y su ícono.
- **Color por tipo:** cada tipo de movimiento o acción toma ícono y color de su mapa `*_META`, y el mismo hecho se ve igual en todas las pantallas: la asignación usa Azul CESAL con el ícono de usuario con más, y el alta usa verde con el ícono de círculo con más.

### Matriz enlazable (firma)
Una matriz de conteos donde cada cifra es una puerta a los activos que cuenta (Reportes: sede o unidad operativa × tipo de activo).
- **Cifras enlazables:** toda cifra mayor que cero es un enlace en Azul CESAL, subrayado en reposo (desplazado 4px), con esquinas de 8px y 4px × 8px de padding. Tiene `aria-label` con lo que cuenta ("Equipos informáticos en Huachipa: 12"). En hover toma un fondo azul al 10%. Un cero va en Tinta Suave y no enlaza. Al imprimir se quita el subrayado.
- **Celda elegida:** fondo azul al 10%, texto azul y un anillo interior de 2px en Azul CESAL, con `aria-current`. Su fila completa lleva un tinte azul al 5%. Los totales de fila y de columna también se eligen y van en semibold.
- **Columna fija:** la primera columna (sede o unidad) queda fija a la izquierda al deslizar en horizontal. Su fondo es opaco y del mismo tono que su fila (Papel; azul al 5% mezclado con Papel en la fila elegida; Papel Gris al 40% mezclado con Papel en la fila de totales) para tapar las cifras que pasan por debajo.
- **Encabezados de tipo:** alineados a la derecha y abajo, con el ícono de 14px del tipo en su color de `TIPO_ACTIVO_META` sobre el nombre oficial completo.
- **Desglose:** debajo de la matriz, una tarjeta titulada con la celda elegida y un enlace "Ver todos" para quitar la selección. Pantalla, impresión y Excel muestran lo mismo.

## Do's and Don'ts

### Do:
- **Do** usar el Azul CESAL (#2a78d6) para toda acción primaria, foco y navegación activa, y ningún otro color para eso.
- **Do** acompañar cada color de identidad con ícono y texto (chip tintado al 15%), tomándolos del mapa `*_META` correspondiente.
- **Do** formatear cifras con `es-PE` y numerales tabulares.
- **Do** separar planos con anillo fino y la sombra Reposo, y reservar sombras mayores para lo que flota.
- **Do** escribir toda la interfaz en español, con el vocabulario oficial de CESAL: sede, ambiente, responsable, código patrimonial, los 7 tipos con su nombre exacto.
- **Do** probar cada pantalla en modo oscuro e impresión: el oscuro tiene sus propios valores y la impresión siempre sale clara.

### Don't:
- **Don't** parecer software contable antiguo: nada de grises planos sin jerarquía, tablas sin agrupación ni íconos de otra época.
- **Don't** parecer una startup SaaS genérica: nada de degradados morados, ilustraciones 3D, glassmorphism ni frases de marketing.
- **Don't** parecer Excel en el navegador: nada de rejillas densas sin secciones, sin color de identidad ni jerarquía visual.
- **Don't** reusar los colores de estado (#0ca30c, #fab219, #d03b3b) como color de tipo, de sección o de serie.
- **Don't** poner el brillo azul y amarillo de marca en componentes. Vive solo en el fondo de página del modo claro.
- **Don't** usar bordes de acento de más de 1px, salvo el marcador del menú lateral.
- **Don't** generar un color nuevo para un tipo de activo. Los 7 slots son fijos y siguen el orden oficial.
