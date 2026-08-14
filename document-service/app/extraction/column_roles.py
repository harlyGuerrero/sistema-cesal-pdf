"""Asignación de rol a cada columna (descripción/cantidad/precio unitario/total).

Basado en tipo de dato y en si `cantidad * precioUnitario ≈ total` se cumple
fila a fila — nunca en el texto del encabezado (ver ARCHITECTURE.md sección 4).
"""

from dataclasses import dataclass
from itertools import permutations

from .column_stats import compute_column_stats
from .parsing import parse_number
from .table_detection import DESCRIPTION_NUMERIC_RATIO_MAX, NUMERIC_COLUMN_RATIO_MIN

RELATIVE_TOLERANCE = 0.02


@dataclass
class ColumnRoles:
    description: int | None
    quantity: int | None
    unit_price: int | None
    total_price: int | None


def _pick_description_column(data_rows: list[list[str]], num_cols: int) -> int | None:
    candidates = []
    for col in range(num_cols):
        stats = compute_column_stats(data_rows, col)
        if stats.numeric_ratio <= DESCRIPTION_NUMERIC_RATIO_MAX and stats.avg_text_len > 0:
            candidates.append((stats.avg_text_len, col))
    if not candidates:
        return None
    return max(candidates)[1]


def _numeric_columns(data_rows: list[list[str]], num_cols: int, exclude: int | None) -> list[int]:
    cols = []
    for col in range(num_cols):
        if col == exclude:
            continue
        stats = compute_column_stats(data_rows, col)
        if stats.numeric_ratio >= NUMERIC_COLUMN_RATIO_MIN:
            cols.append(col)
    return cols


def _score_triple(data_rows: list[list[str]], qty_col: int, unit_col: int, total_col: int) -> int:
    matches = 0
    for row in data_rows:
        qty = parse_number(row[qty_col]) if qty_col < len(row) else None
        unit = parse_number(row[unit_col]) if unit_col < len(row) else None
        total = parse_number(row[total_col]) if total_col < len(row) else None
        if qty is None or unit is None or total is None:
            continue
        expected = qty * unit
        if total == 0 and expected == 0:
            matches += 1
        elif total != 0 and abs(expected - total) / abs(total) <= RELATIVE_TOLERANCE:
            matches += 1
    return matches


def assign_column_roles(data_rows: list[list[str]], num_cols: int) -> ColumnRoles:
    description_col = _pick_description_column(data_rows, num_cols)
    numeric_cols = _numeric_columns(data_rows, num_cols, exclude=description_col)

    if len(numeric_cols) >= 3:
        best_score = -1
        best_triple: tuple[int, int, int] | None = None
        for triple in permutations(numeric_cols, 3):
            score = _score_triple(data_rows, *triple)
            if score > best_score:
                best_score = score
                best_triple = triple
        if best_triple is not None and best_score > 0:
            qty_col, unit_col, total_col = best_triple
            return ColumnRoles(description_col, qty_col, unit_col, total_col)
        # Sin filas que validen la relación cantidad*precio=total: mejor esfuerzo
        # por magnitud (cantidad = valor promedio más chico).
        ordered = sorted(
            numeric_cols, key=lambda c: compute_column_stats(data_rows, c).avg_value or 0
        )
        return ColumnRoles(description_col, ordered[0], ordered[1], ordered[-1])

    if len(numeric_cols) == 2:
        stats = {c: compute_column_stats(data_rows, c) for c in numeric_cols}
        ordered = sorted(numeric_cols, key=lambda c: stats[c].avg_value or 0)
        smaller, larger = ordered
        if stats[smaller].integer_ratio >= 0.8:
            return ColumnRoles(description_col, smaller, None, larger)
        return ColumnRoles(description_col, None, smaller, larger)

    if len(numeric_cols) == 1:
        return ColumnRoles(description_col, None, None, numeric_cols[0])

    return ColumnRoles(description_col, None, None, None)
