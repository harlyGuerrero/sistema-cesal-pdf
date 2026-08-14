"""Product Table Detection (ver ARCHITECTURE.md sección 4, skill pdf-extraction).

Detecta la tabla de productos por estructura: densidad numérica por columna,
presencia de una columna descriptiva y repetición de patrón fila a fila.
Nunca por coordenadas, proveedor, o lista fija de encabezados.
"""

from .column_stats import compute_column_stats, row_numeric_density
from .models import Table

MIN_DATA_ROWS = 1
DESCRIPTION_NUMERIC_RATIO_MAX = 0.3
NUMERIC_COLUMN_RATIO_MIN = 0.5


def detect_header_row_index(table: Table) -> int | None:
    """Una fila de encabezado tiene mucha menos densidad numérica que las que le siguen."""
    if table.num_rows < 2:
        return None

    first_density = row_numeric_density(table.rows[0])
    rest_densities = [row_numeric_density(row) for row in table.rows[1:]]
    avg_rest = sum(rest_densities) / len(rest_densities) if rest_densities else 0.0

    if avg_rest > 0 and first_density < avg_rest:
        return 0
    return None


def score_product_table(table: Table) -> float:
    header_idx = detect_header_row_index(table)
    data_rows = table.rows[header_idx + 1 :] if header_idx is not None else table.rows

    if len(data_rows) < MIN_DATA_ROWS or table.num_cols < 2:
        return 0.0

    col_stats = [compute_column_stats(data_rows, c) for c in range(table.num_cols)]

    has_description_col = any(
        s.numeric_ratio <= DESCRIPTION_NUMERIC_RATIO_MAX and s.avg_text_len >= 3
        for s in col_stats
    )
    numeric_cols = [s for s in col_stats if s.numeric_ratio >= NUMERIC_COLUMN_RATIO_MIN]

    if not has_description_col or len(numeric_cols) < 1:
        return 0.0

    # Más filas de datos y más columnas numéricas consistentes = más confianza.
    return len(data_rows) * (1 + len(numeric_cols))


def select_product_table(tables: list[Table]) -> tuple[Table | None, int | None]:
    best_table: Table | None = None
    best_header_idx: int | None = None
    best_score = 0.0

    for table in tables:
        score = score_product_table(table)
        if score > best_score:
            best_score = score
            best_table = table
            best_header_idx = detect_header_row_index(table)

    if best_score <= 0.0:
        return None, None
    return best_table, best_header_idx
