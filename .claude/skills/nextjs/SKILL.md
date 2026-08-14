---
name: nextjs
description: Convenciones de Next.js App Router para este proyecto — rutas Dashboard/Productos/Importaciones, límite frontend/backend. Usar al crear rutas, layouts o server actions.
---

# Next.js

## Routing

App Router (`app/`). **No** React Router, ni ninguna librería de routing alternativa.

Áreas funcionales (todas implementadas desde Fase 12):

- `/` — Dashboard (`app/page.tsx`, `export const dynamic = "force-dynamic"` — sin esto Next la prerenderiza estática en build y los números quedan congelados; ver skill `performance`/nota de Fase 12 si aparece el mismo problema en otra página con datos que cambian)
- `/productos`, `/productos/[id]`, `/productos/nuevo` — Productos (Fase 10)
- `/importaciones`, `/importaciones/[id]` — Importaciones (Fase 9 y 11)

Navegación (Fase 13): sidebar de shadcn/ui (`components/ui/sidebar.tsx`, bloque `sidebar-07`), montado en `app/layout.tsx` (`SidebarProvider` + `AppSidebar` + `SidebarInset`, envuelto en `TooltipProvider` — el sidebar usa tooltips en modo colapsado y no trae su propio provider). `components/app-sidebar.tsx` + `components/nav-main.tsx` son la versión adaptada a este proyecto: nav plana de 3 links directos (Dashboard/Productos/Importaciones, resaltado por `usePathname()`), **no** el patrón colapsable con sub-items del bloque original (ninguna de las 3 secciones tiene páginas hijas que listar en el sidebar). Sin `TeamSwitcher` ni `NavUser` del bloque original — no hay concepto de equipos ni de usuario autenticado todavía (auth fuera de alcance, ver CLAUDE.md); no inventar datos de usuario falsos para llenar el componente. No crear una nav nueva por página.

## Límite con el Python Document Service

Las rutas/server actions de Next.js que disparan procesamiento de PDF solo hacen la llamada HTTP al Python Document Service y persisten el resultado. No contienen lógica de extracción ni de OCR. Ver skill `document-ai` y `architecture`.

## Server vs cliente

Preferir Server Components y Server Actions para todo lo que toca base de datos o el Document Service. Client Components solo donde se necesita interactividad real (formularios, revisión humana de `ImportItem`, tablas con estado de UI).
