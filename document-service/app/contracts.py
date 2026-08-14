"""Contrato HTTP del Document Service. Ver ARCHITECTURE.md sección 2 y skill document-ai.

El lado Next.js valida esta misma forma con Zod (skill validation/typescript) — si se
cambia un campo aquí, hay que cambiarlo también en el schema Zod correspondiente.
"""

from pydantic import BaseModel, Field


class ProductSource(BaseModel):
    page: int
    table: int
    row: int


class ProductCandidate(BaseModel):
    rawText: str
    name: str | None = None
    quantity: float | None = None
    unitPrice: float | None = None
    totalPrice: float | None = None
    currency: str | None = None
    source: ProductSource
    confidence: float = Field(ge=0.0, le=1.0)


class DocumentInfo(BaseModel):
    pages: int


class ProcessMetrics(BaseModel):
    fileHash: str
    fileSizeBytes: int
    processingTimeMs: int
    engine: str | None = None


class ProcessResponse(BaseModel):
    document: DocumentInfo
    tables: list[dict] = []
    products: list[ProductCandidate] = []
    metrics: ProcessMetrics


class ErrorResponse(BaseModel):
    detail: str
