import os

# PDFs son input no confiable (ver ARCHITECTURE.md 9, skill security). Estos límites
# se aplican en el límite de entrada, antes de cualquier procesamiento.

MAX_FILE_SIZE_BYTES = int(os.environ.get("MAX_FILE_SIZE_BYTES", 20 * 1024 * 1024))  # 20 MB
ALLOWED_MIME_TYPES = {"application/pdf"}
ALLOWED_EXTENSIONS = {".pdf"}
PDF_MAGIC_BYTES = b"%PDF-"
PROCESSING_TIMEOUT_SECONDS = float(os.environ.get("PROCESSING_TIMEOUT_SECONDS", 60))

HOST = os.environ.get("DOCUMENT_SERVICE_HOST", "127.0.0.1")
PORT = int(os.environ.get("DOCUMENT_SERVICE_PORT", 8001))
