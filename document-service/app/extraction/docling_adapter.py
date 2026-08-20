"""Único punto de contacto con Docling (ver skill docling: layout + tablas,
nada de detección de tabla de productos ni clasificación aquí).
"""

import io
import os

# torch intenta compilar kernels con un compilador C++ (cl.exe) que no está
# disponible en esta máquina Windows sin Visual Studio Build Tools; se
# deshabilita torch.compile para que corra en modo eager. Debe fijarse antes
# de que Docling/torch lo evalúen en tiempo de ejecución.
os.environ.setdefault("TORCHDYNAMO_DISABLE", "1")

from docling.datamodel.base_models import DocumentStream, InputFormat
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    RapidOcrOptions,
    TableFormerMode,
    TableStructureOptions,
)
from docling.document_converter import DocumentConverter, PdfFormatOption

from .invoice_number import detect_invoice_number
from .models import Table

_converter: DocumentConverter | None = None


def _build_pipeline_options() -> PdfPipelineOptions:
    return PdfPipelineOptions(
        do_ocr=True,
        # RapidOCR es el único motor OCR instalado (ver requirements.txt) —
        # se fija explícito en vez de dejar que Docling auto-detecte, porque
        # OcrAutoModel arma RapidOcrOptions SIN heredar `lang`, así que cae
        # en su default de fábrica lang=["chinese"]. Facturas de este
        # sistema son en español: "latin" es el modelo de reconocimiento de
        # RapidOCR que cubre alfabeto latino con tildes/ñ (no hay un modelo
        # "es" dedicado en RapidOCR/PP-OCR). Backend "torch": es el que de
        # hecho queda disponible en este entorno (onnxruntime no está
        # instalado pese a figurar como backend "por defecto" de RapidOCR;
        # torch sí, y es al que la auto-detección de Docling termina cayendo).
        ocr_options=RapidOcrOptions(lang=["latin"], backend="torch"),
        do_table_structure=True,
        # ACCURATE ya es el default de esta versión de Docling, pero se fija
        # explícito para no depender de que un upgrade futuro lo cambie —
        # facturas tienen tablas densas y chicas, vale la pena el costo extra
        # frente a FAST.
        table_structure_options=TableStructureOptions(mode=TableFormerMode.ACCURATE),
    )


def _get_converter() -> DocumentConverter:
    global _converter
    if _converter is None:
        _converter = DocumentConverter(
            allowed_formats=[InputFormat.PDF],
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=_build_pipeline_options())
            },
        )
    return _converter


def extract(content: bytes, filename: str) -> tuple[int, list[Table], str | None]:
    """Devuelve (num_páginas, tablas, n° de factura detectado) a partir de los
    bytes de un PDF."""
    source = DocumentStream(name=filename, stream=io.BytesIO(content))
    result = _get_converter().convert(source)
    document = result.document

    num_pages = len(document.pages)

    tables: list[Table] = []
    for index, table_item in enumerate(document.tables):
        page_no = table_item.prov[0].page_no if table_item.prov else 1
        grid = _table_item_to_grid(table_item)
        if grid:
            tables.append(Table(page=page_no, index=index, rows=grid))

    invoice_number = detect_invoice_number(document.export_to_text())

    return num_pages, tables, invoice_number


def _table_item_to_grid(table_item) -> list[list[str]]:
    data = table_item.data
    num_rows = data.num_rows
    num_cols = data.num_cols
    grid = [["" for _ in range(num_cols)] for _ in range(num_rows)]

    for cell in data.table_cells:
        text = (cell.text or "").strip()
        for r in range(cell.start_row_offset_idx, cell.end_row_offset_idx):
            for c in range(cell.start_col_offset_idx, cell.end_col_offset_idx):
                if r < num_rows and c < num_cols:
                    grid[r][c] = text

    return grid
