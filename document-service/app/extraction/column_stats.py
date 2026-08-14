"""Estadísticas estructurales por columna. Usado tanto para elegir la tabla de
productos como para asignar el rol de cada columna (ver skill pdf-extraction:
detección basada en tipo de dato y patrón, nunca en encabezados fijos).
"""

from dataclasses import dataclass

from .parsing import is_integer_like, is_numeric_cell, parse_number


@dataclass
class ColumnStats:
    numeric_ratio: float
    avg_value: float | None
    avg_text_len: float
    integer_ratio: float


def compute_column_stats(rows: list[list[str]], col_index: int) -> ColumnStats:
    values: list[str] = []
    for row in rows:
        values.append(row[col_index] if col_index < len(row) else "")

    non_empty = [v for v in values if v and v.strip()]
    if not non_empty:
        return ColumnStats(numeric_ratio=0.0, avg_value=None, avg_text_len=0.0, integer_ratio=0.0)

    numeric_cells = [v for v in non_empty if is_numeric_cell(v)]
    parsed = [n for n in (parse_number(v) for v in numeric_cells) if n is not None]

    numeric_ratio = len(numeric_cells) / len(non_empty)
    avg_value = sum(parsed) / len(parsed) if parsed else None
    avg_text_len = sum(len(v) for v in non_empty) / len(non_empty)
    integer_ratio = (
        sum(1 for n in parsed if is_integer_like(n)) / len(parsed) if parsed else 0.0
    )

    return ColumnStats(
        numeric_ratio=numeric_ratio,
        avg_value=avg_value,
        avg_text_len=avg_text_len,
        integer_ratio=integer_ratio,
    )


def row_numeric_density(row: list[str]) -> float:
    non_empty = [c for c in row if c and c.strip()]
    if not non_empty:
        return 0.0
    numeric = [c for c in non_empty if is_numeric_cell(c)]
    return len(numeric) / len(non_empty)
