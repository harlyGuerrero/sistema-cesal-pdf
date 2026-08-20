"""Product Rows -> Product Candidate (ver ARCHITECTURE.md sección 4).

Una fila se convierte en ProductCandidate solo si la estructura indica que es
un producto: cantidad positiva + al menos un precio + descripción no vacía.
Filas de resumen (Subtotal/IVA/IRPF/Total) o campos sueltos (IBAN/NIF/Notas)
no cumplen esto y quedan fuera, sin depender de listas de palabras prohibidas.
"""

from ..contracts import ProductCandidate, ProductSource
from .column_roles import RELATIVE_TOLERANCE, ColumnRoles
from .models import Table
from .parsing import parse_number

HIGH_CONFIDENCE = 0.95
PARTIAL_CONFIDENCE = 0.6
SINGLE_PRICE_CONFIDENCE = 0.75


def _compute_confidence(
    quantity: float, unit_price: float | None, total_price: float | None
) -> float:
    if unit_price is None or total_price is None:
        return SINGLE_PRICE_CONFIDENCE

    expected = quantity * unit_price
    if total_price == 0:
        return HIGH_CONFIDENCE if expected == 0 else PARTIAL_CONFIDENCE
    if abs(expected - total_price) / abs(total_price) <= RELATIVE_TOLERANCE:
        return HIGH_CONFIDENCE
    return PARTIAL_CONFIDENCE


def rows_to_candidates(
    table: Table, header_idx: int | None, roles: ColumnRoles
) -> list[ProductCandidate]:
    start = header_idx + 1 if header_idx is not None else 0
    data_rows = table.rows[start:]

    candidates: list[ProductCandidate] = []
    for offset, row in enumerate(data_rows):
        row_index = start + offset

        def cell(col: int | None) -> str | None:
            if col is None or col >= len(row):
                return None
            return row[col]

        description = cell(roles.description)
        quantity = parse_number(cell(roles.quantity))
        unit_price = parse_number(cell(roles.unit_price))
        total_price = parse_number(cell(roles.total_price))

        if quantity is None or quantity <= 0:
            continue
        if unit_price is None and total_price is None:
            continue
        if not description or not description.strip():
            continue

        raw_text = " | ".join(c.strip() for c in row if c and c.strip())

        confidence = _compute_confidence(quantity, unit_price, total_price)
        if roles.ambiguous:
            # La fila puede cuadrar matemáticamente por pura coincidencia (ver
            # ColumnRoles.ambiguous): la asignación de columnas en sí no quedó
            # determinada, así que un match perfecto no amerita HIGH_CONFIDENCE.
            confidence = min(confidence, PARTIAL_CONFIDENCE)

        candidates.append(
            ProductCandidate(
                rawText=raw_text,
                name=description.strip(),
                quantity=quantity,
                unitPrice=unit_price,
                totalPrice=total_price,
                currency=None,
                source=ProductSource(page=table.page, table=table.index, row=row_index),
                confidence=confidence,
            )
        )

    return candidates
