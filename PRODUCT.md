# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** the central logistics/administration team at CESAL's main office in Lima (San Isidro). They register and control the fixed assets of every sede from one place: loading supplier invoices, creating assets, assigning responsables and locations, and recording movements.
- **Roles:** exactly two, `SUPER_ADMIN` (Super Administrador) and `ADMIN` (Administrador). There is no per-sede user role. Sede staff are tracked as **Responsables** (people who hold assets), not as system users.

## Product Purpose

Sistema Patrimonial CESAL is the single register of CESAL's fixed assets (patrimonio). It replaces scattered Excel spreadsheets.

Success means:

- **Know where every asset is:** its sede, unidad operativa, ambiente, responsable, estado patrimonial and condición física, at any moment.
- **Pass audits and the annual physical inventory:** every asset has a permanent código patrimonial, a traceable origin (the invoice it came from, or a manual registration), and a full movement history.
- **Stop maintaining Excel by hand:** Excel stays only as import/export, never as the source of truth.

## Positioning

Assets enter the register from the supplier's own invoice. A PDF invoice is parsed structurally, never by supplier-specific rules. Each product row is classified into one of CESAL's 7 official asset types, and a human confirms anything uncertain. Every confirmed unit then becomes its own asset with its own código patrimonial. Origin (invoice, supplier, N° de factura, N° de FC) stays linked to the physical unit for its whole life.

## Operating Context

- **Office desktop:** long sessions of invoice upload, row-by-row review, bulk asset registration, reports and Excel import/export, on a large screen.
- **Phone in the field:** physical inventory, walking through ambientes and reading the códigos patrimoniales printed on labels attached to each asset.
- **Sedes:** San Isidro (main office), Huachipa (several unidades operativas: CAE, AYTO, OIM, CETPRO, SIRAY WASI), Abancay, Andahuaylas, Apurímac, Atalaya. Region (Costa/Sierra/Selva) is a sede attribute.
- **Documents:** supplier invoices in PDF (often Peruvian SUNAT electronic invoices, but also internal numbering such as `FACTURA-55-01898`), and Excel workbooks for bulk import and reports.

## Capabilities and Constraints

- **Modules:** Dashboard, Activos, Importaciones, Reportes, Sedes (unidades operativas, ambientes), Responsables, Usuarios, Movimientos, Auditoría, Notificaciones, Mi Cuenta. Configuration covers Tipos de Activo, Categorías, Campos and Catálogos.
- **Taxonomy:** Tipo de activo → Categoría → Subcategoría → Activo. There are exactly **7 official types**: Edificaciones, Vehículos y medios de transporte, Equipos informáticos, Equipos de oficina, Activos intangibles informáticos, Maquinaria y equipos, Mobiliario y enseres. Never add an "Otros" type, and never rename the types to generic labels.
- **Código patrimonial:** generated once, never edited, because it is printed on a physical label. The format is `PREFIJO-AB-AA-NNNN`.
- **Estado patrimonial:** Disponible, Asignado, Mantenimiento or Baja. It is a different concept from condición física (Nuevo to Deteriorado).
- **Invoice pipeline:** a separate Python Document Service (Docling/OCR) handles extraction. Classification uses rules first, with a local Ollama model as fallback, plus mandatory human review when uncertain. PDFs are untrusted input.
- **Interface:** all UI text is in Spanish (Peru), with `es-PE` number and date formatting.
- **Undecided:** whether field inventory needs a dedicated mobile flow (scan or search by código, quick confirm). Today it uses the same responsive app.

## Brand Commitments

- **Name:** "Sistema Patrimonial CESAL" (page title template `%s — Sistema Patrimonial CESAL`).
- **Existing assets:** `public/logo-desktop.svg`, `public/logo-mobile.svg`, `public/bg-login.jpg` and `app/icon.png`.
- **Terminology:** official CESAL terms are used as-is: sede, unidad operativa, ambiente, responsable, código patrimonial, N° de FC.

## Evidence on Hand

- **Real data:** about 254 real assets, already migrated from CESAL's inventory, across the 7 types and 6 sedes.
- **Invoices:** real and synthetic test invoices in `document-service/tests/fixtures/`, plus an extraction benchmark in `document-service/tests/benchmark/`.
- **Absences:** there are no user testimonials, usage metrics or external references. Do not invent them.

## Product Principles

1. **The register must be trustworthy enough for an auditor.** Traceability (origin, history, who changed what) outranks convenience.
2. **One physical thing is one asset.** Quantities split into units, and each unit keeps its own identity forever.
3. **Machines propose, people confirm.** Automatic extraction and classification always show uncertainty and never silently save a guess.
4. **CESAL's own vocabulary wins.** Official types, sede names and terms appear exactly as the organization uses them.
5. **Built for the central team's daily load.** Dense, scannable desktop workflows come first, and must still hold up on a phone during physical inventory.
