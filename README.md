# Sistema de importación de productos desde PDFs

Sube facturas en PDF, detecta y extrae la tabla de productos, clasifica cada
producto (relevancia + categoría patrimonial) y permite revisar/confirmar
antes de guardarlo. Ver `ARCHITECTURE.md` para el diseño completo y
`CLAUDE.md` para las reglas de trabajo del proyecto — esos dos archivos, más
`.claude/agents/` y `.claude/skills/`, son la documentación real y viva del
proyecto (no la de este README, que es solo la guía de instalación).

## Stack

- **Frontend/backend**: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, Prisma 7 + PostgreSQL.
- **Procesamiento de documentos**: servicio Python separado (FastAPI + Docling), en `document-service/`.
- **Clasificación**: reglas determinísticas + Ollama local como fallback.
- **Testing**: Vitest (Next.js), pytest (Document Service).

## Prerrequisitos

Instala esto antes de empezar (en Windows, todo tiene paquete de `winget`):

| Herramienta | Versión usada | Para qué |
|---|---|---|
| [Node.js](https://nodejs.org) | 20+ | Next.js |
| [Python](https://python.org) | 3.12 | Document Service |
| [PostgreSQL](https://www.postgresql.org/) | 17 | Base de datos |
| [Ollama](https://ollama.com) | — | Clasificación local (fallback) |
| [Git](https://git-scm.com) | — | — |

```powershell
winget install Python.Python.3.12
winget install PostgreSQL.PostgreSQL.17
winget install Ollama.Ollama
```

## Setup

### 1. Clonar e instalar dependencias de Next.js

```powershell
git clone https://github.com/harlyGuerrero/sistema-cesal-pdf.git
cd sistema-cesal-pdf
npm install
```

### 2. Variables de entorno

```powershell
Copy-Item .env.example .env
```

Ajusta `DATABASE_URL` si tu usuario/contraseña/puerto de Postgres son distintos
a `postgres`/`postgres`/`5432` (esos son los que usa esta guía).

### 3. Base de datos

Crea la base (una vez, con el superusuario de Postgres):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE product_import;"
```

Aplica las migraciones y siembra las 6 categorías patrimoniales (fijas, ver
`ARCHITECTURE.md` sección 5.2):

```powershell
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

### 4. Document Service (Python)

**Importante en Windows**: si el proyecto vive dentro de una carpeta sincronizada
por OneDrive (como esta), crea el entorno virtual **fuera** de esa carpeta —
`torch` (dependencia de Docling) tiene rutas de archivo tan largas que exceden
el límite de 260 caracteres de Windows si el venv queda anidado ahí (ver skill
`docling`). Por ejemplo:

```powershell
python -m venv C:\venvs\spc-document-service
C:\venvs\spc-document-service\Scripts\pip.exe install -r document-service\requirements.txt
```

(Si tu carpeta del proyecto NO está bajo OneDrive, un venv normal en
`document-service\.venv` funciona sin problema.)

Arrancar el servicio (déjalo corriendo en su propia terminal):

```powershell
cd document-service
C:\venvs\spc-document-service\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Verificar: `http://127.0.0.1:8001/health` debe responder `{"status":"ok"}`.

### 5. Ollama

Ollama corre como servicio en segundo plano tras instalarlo. Descarga el
modelo de clasificación (~1.9GB):

```powershell
ollama pull qwen2.5:3b-instruct
```

Verificar: `http://127.0.0.1:11434/api/version` debe responder.

### 6. Login

Todo el sistema queda detrás de login (ver `CLAUDE.md`). Genera tu propio
`AUTH_SECRET` (firma las cookies de sesión, no reutilices el de otra
máquina) y agrégalo a `.env`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

No hay seed con un usuario ni contraseña por defecto a propósito. Crea el
primer Super Administrador por consola:

```powershell
npm run crear-admin
```

### 7. Levantar Next.js

```powershell
npm run dev
```

Abre `http://localhost:3000`. Con Postgres, el Document Service y Ollama
corriendo, ya puedes subir un PDF desde la pantalla de Importaciones.

## Comandos útiles

```powershell
npm run lint            # ESLint
npm run build            # build de producción
npm run test              # Vitest (Next.js)
npx prisma studio          # explorador visual de la base de datos

cd document-service
C:\venvs\spc-document-service\Scripts\python.exe -m pytest -v   # tests del Document Service
```

## Estructura

```
app/                  — rutas Next.js (App Router)
components/            — componentes shadcn/ui + componentes propios
lib/                    — lógica de dominio (normalización, clasificación, Prisma, etc.)
prisma/                 — schema, migraciones, seed
document-service/       — servicio Python (Docling, extracción)
tests/, document-service/tests/  — Vitest y pytest
.claude/agents/, .claude/skills/ — contexto y reglas del proyecto para trabajar con Claude Code
fixtures/                — PDFs de prueba para el benchmark (ver ARCHITECTURE.md sección 8)
```
