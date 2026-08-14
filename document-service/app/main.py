"""Document Service — API HTTP del procesamiento documental.

Responsabilidad (ver ARCHITECTURE.md sección 2, CLAUDE.md regla 1):
recibir un PDF, procesarlo, devolver una estructura normalizada.
No guarda productos en PostgreSQL, no conoce UI ni componentes React.

Fase 4: extracción real con Docling (layout + tablas) -> Product Table
Detection -> Product Candidates. La clasificación (relevance/category) es
Fase 6/7, todavía no ocurre aquí.
"""

import asyncio
import time

from fastapi import FastAPI, HTTPException, UploadFile

from . import config, security
from .contracts import DocumentInfo, ProcessMetrics, ProcessResponse
from .extraction.docling_adapter import extract
from .extraction.pipeline import run_pipeline

app = FastAPI(title="Document Service", version="0.1.0")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/v1/documents/process", response_model=ProcessResponse)
async def process_document(file: UploadFile) -> ProcessResponse:
    content = await file.read()

    try:
        security.validate_upload(file.filename or "", file.content_type, content)
    except security.PdfValidationError as error:
        raise HTTPException(status_code=400, detail=error.message) from error

    started_at = time.monotonic()
    try:
        num_pages, tables = await asyncio.wait_for(
            asyncio.to_thread(extract, content, file.filename or "document.pdf"),
            timeout=config.PROCESSING_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError as error:
        raise HTTPException(status_code=504, detail="Tiempo de procesamiento excedido") from error
    except Exception as error:  # Docling agrupa sus propios errores de conversión
        raise HTTPException(status_code=422, detail=f"No se pudo procesar el PDF: {error}") from error

    products, tables_summary = run_pipeline(tables)

    processing_time_ms = int((time.monotonic() - started_at) * 1000)

    return ProcessResponse(
        document=DocumentInfo(pages=num_pages),
        tables=tables_summary,
        products=products,
        metrics=ProcessMetrics(
            fileHash=security.compute_hash(content),
            fileSizeBytes=len(content),
            processingTimeMs=processing_time_ms,
            engine="DOCLING",
        ),
    )
