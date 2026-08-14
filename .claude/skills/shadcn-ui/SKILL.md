---
name: shadcn-ui
description: Convenciones de shadcn/ui y React Hook Form + Zod para formularios en este proyecto. Usar al construir cualquier UI, especialmente formularios de revisión/confirmación de productos.
---

# shadcn/ui

`components.json` ya está inicializado en la raíz del proyecto. Añadir componentes vía el CLI de shadcn, no copiarlos a mano ni reimplementarlos.

## Formularios

Todo formulario usa React Hook Form + Zod como resolver. El schema de Zod es la fuente de verdad de validación en el cliente y debe reflejar, sin duplicar lógica, las mismas reglas que valida el backend (ver skill `validation`).

**Desviación conocida (Fase 9)**: los diálogos de Editar/Rechazar en `/importaciones/[id]/review-table.tsx` usan `<form>` nativo + `FormData` contra Server Actions directamente, sin React Hook Form ni validación Zod en cliente (solo `required` de HTML + validación manual en el servidor, ver `actions.ts`). Se hizo así por ser el patrón más directo para Server Actions simples con pocos campos; si estos formularios crecen en complejidad (más campos, validación cruzada, mensajes de error por campo), migrar a RHF+Zod entonces — no se justificaba el peso extra todavía. No repetir esta desviación en formularios nuevos sin una razón similar.

## Base UI, no Radix

Este proyecto usa `@base-ui/react` como motor de shadcn (`style: "base-nova"` en `components.json`), no Radix — la API difiere en detalles: `Dialog`/`Select` importan de `@base-ui/react/dialog`/`@base-ui/react/select`. Notas prácticas (Fase 9):

- `DialogTrigger` usa el patrón `render` de Base UI para envolver otro componente: `<DialogTrigger render={<Button size="sm" variant="outline" />}>Editar</DialogTrigger>`, no `asChild` como en Radix.
- `Select` (root) acepta `name` y genera automáticamente un input oculto para que su valor viaje en un `<form>` nativo — no hace falta cablear esto a mano.

## Iconos

Lucide (`lucide-react`) para todo ícono. No mezclar con otra librería de íconos.

## Consistencia

Reutilizar los primitivos de shadcn ya generados antes de escribir un componente custom. Un componente custom se justifica solo cuando shadcn no cubre el patrón (ej. tabla de revisión con estados de confidence por fila).

## Sidebar (Fase 13)

Instalado vía `npx shadcn@latest add sidebar-07` — trae el primitivo `sidebar.tsx` completo más soporte (`tooltip`, `dropdown-menu`, `avatar`, `sheet`, `breadcrumb`, `collapsible`, `separator`, `skeleton`, `hooks/use-mobile.ts`) y un ejemplo genérico con datos ficticios (equipos, usuario, nav con submenús, página demo en `/dashboard`). El ejemplo se adaptó a este proyecto — ver skill `nextjs` para el detalle de qué se mantuvo/quitó. La página demo `app/dashboard/page.tsx` se borró (ruta duplicada/confusa con el Dashboard real en `/`).

**Bug real encontrado y corregido** en `hooks/use-mobile.ts` (archivo generado por el CLI, no escrito por nosotros): llamaba `setState` de forma síncrona dentro de un `useEffect` además de en el listener del evento — dispara la regla `react-hooks/set-state-in-effect` de ESLint (error, no warning). Fix: mover el valor inicial a un inicializador perezoso de `useState(() => ...)` con guard `typeof window === "undefined"`, dejar el `useEffect` solo para suscribirse a cambios futuros. Si se vuelve a generar este archivo con `--overwrite` en el futuro, hay que reaplicar este fix.

## Toast, Alert, Tabs (Fase 13)

Instalados vía `npx shadcn@latest add alert tabs sonner`. `sonner` trajo `next-themes` como dependencia — se cableó de verdad (`components/theme-provider.tsx`, envuelve todo en `app/layout.tsx` con `attribute="class"`, y `<html suppressHydrationWarning>`), no se dejó instalado a medias: `app/globals.css` ya tenía `.dark` definido desde el scaffold pero nada lo activaba hasta ahora.

- **Toast**: `import { toast } from "sonner"` (no desde `@/components/ui/sonner`, ese archivo solo exporta `<Toaster />`, montado una vez en `app/layout.tsx`). Usar `toast.success(...)`/`toast.error(...)` en el cliente después de `await` una Server Action que **no navega** (confirmar/editar/rechazar en `/importaciones/[id]`, guardar en `/productos/[id]`) — las que sí navegan (crear/eliminar producto) ya usan el patrón de error inline de Fase 9/10, no hace falta duplicarlo con un toast.
- **Bug real encontrado y corregido al agregar los toasts**: varias llamadas a Server Action desde `startTransition` no tenían `try/catch` (`confirmItemAction`, `editAndConfirmItemAction`, `rejectItemAction` en `review-table.tsx`; `updateProductAction` en `product-edit-form.tsx`) — un error de validación del servidor terminaba en una promesa rechazada sin manejar, sin ningún feedback visible para el usuario. Se envolvió cada llamada en `try/catch` con `toast.error` en el catch. Cualquier `startTransition(async () => actionQueLanzaErrores())` nuevo necesita este patrón.
- **Alert**: reemplaza texto plano de aviso/error (`<p className="text-destructive">...`) — variant `default` para avisos informativos (ej. "ya existía este producto" en `/productos/[id]`), variant `destructive` con ícono para errores de proceso (ej. `Import.errorMessage` en `/importaciones/[id]`).
- **Tabs**: filtro por estado en la tabla de revisión (`/importaciones/[id]`) — Todos/Pendientes/Confirmados/Rechazados/Ignorados, filtrado en cliente sobre los items ya cargados (no re-fetch), con conteo por pestaña.

## Charts / dataviz (Fase 12)

Antes de escribir cualquier chart, stat tile o gráfico nuevo: cargar la skill `dataviz` (forma → color → validar → marcas → interacción → accesibilidad). No elegir colores a ojo.

`--chart-1` en `app/globals.css` (`:root` y `.dark`) ya no es el gris neutro que traía el scaffold — se fijó al slot-1 (azul) de la paleta validada de esa skill: `#2a78d6` claro / `#3987e5` oscuro, vía la misma mecánica de tema por clase `.dark` que ya usa el proyecto (no el patrón `[data-theme]`/media-query de los ejemplos de la skill, que no aplica acá). Usar la clase Tailwind `bg-chart-1` (autogenerada desde `@theme inline`), no un hex hardcodeado. `--chart-2`..`--chart-5` siguen siendo el gris del scaffold, sin usar todavía — si un chart futuro necesita más de una serie/categoría, seguir el proceso de la skill (elegir orden de las 8 familias, validar con el script) antes de rellenarlos, no copiar colores de otro proyecto.

El primer uso fue el gráfico de barras de "Distribución por categoría" en `/` (`app/page.tsx`): comparación de magnitud entre categorías nominales → una sola serie, un solo hue (nunca colorear las 6 categorías con colores distintos — esa sería la codificación categórica, que es el job equivocado para "cuánto", no "cuál"). Barra ≤24px de grosor, extremo redondeado 4px solo del lado del valor, base cuadrada, valor en texto (no coloreado) junto a la punta de la barra, sin leyenda (una sola serie, el título del Card ya dice qué se grafica).
