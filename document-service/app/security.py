"""Validación de PDFs como input no confiable. Ver ARCHITECTURE.md sección 9, skill security.

No confiar en extensión ni Content-Type declarados por el cliente por sí solos:
siempre se verifica también la firma de archivo (magic bytes).
"""

import hashlib
import os

from . import config


class PdfValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def validate_extension(filename: str) -> None:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in config.ALLOWED_EXTENSIONS:
        raise PdfValidationError(f"Extensión de archivo no permitida: {ext or '(ninguna)'}")


def validate_mime(content_type: str | None) -> None:
    if content_type not in config.ALLOWED_MIME_TYPES:
        raise PdfValidationError(f"Content-Type no permitido: {content_type}")


def validate_size(size_bytes: int) -> None:
    if size_bytes == 0:
        raise PdfValidationError("El archivo está vacío")
    if size_bytes > config.MAX_FILE_SIZE_BYTES:
        raise PdfValidationError(
            f"El archivo excede el tamaño máximo permitido ({config.MAX_FILE_SIZE_BYTES} bytes)"
        )


def validate_signature(content: bytes) -> None:
    if not content.startswith(config.PDF_MAGIC_BYTES):
        raise PdfValidationError("La firma del archivo no corresponde a un PDF válido")


def compute_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def validate_upload(filename: str, content_type: str | None, content: bytes) -> None:
    validate_extension(filename)
    validate_mime(content_type)
    validate_size(len(content))
    validate_signature(content)
