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

from docling.datamodel.base_models import DocumentStream
from docling.document_converter import DocumentConverter

from .models import Table

_converter: DocumentConverter | None = None


def _get_converter() -> DocumentConverter:
    global _converter
    if _converter is None:
        _converter = DocumentConverter()
    return _converter


def extract(content: bytes, filename: str) -> tuple[int, list[Table]]:
    """Devuelve (num_páginas, tablas) a partir de los bytes de un PDF."""
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

    return num_pages, tables


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
