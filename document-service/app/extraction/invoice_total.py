"""Detección del importe total de la factura desde el texto plano del documento
(ver skill document-ai). Mismo enfoque que invoice_number.py: estructural, sin
proveedores ni coordenadas fijas (CLAUDE.md regla 3) — busca un número en una
línea rotulada como total del comprobante.

Las filas de resumen (Subtotal/IGV/Total) se descartan a propósito como
productos (ver product_candidate.py); esto las lee aparte, solo para el total.
"""

import re

from .parsing import parse_number

# Rótulos del importe final, de más a menos específico. Un comprobante SUNAT
# suele traer "Importe Total"; otros formatos usan "Total a pagar" o solo
# "TOTAL". El nivel decide entre varias líneas candidatas.
_LABEL_TIERS = [
    re.compile(r"importe\s+total|total\s+a\s+pagar|total\s+(de\s+la\s+)?factura|monto\s+total|total\s+general", re.IGNORECASE),
    re.compile(r"\btotal\b", re.IGNORECASE),
]

# Líneas que dicen "total" pero no son el importe final.
_NOT_GRAND_TOTAL = re.compile(
    r"sub\s*-?\s*total|total\s+(op(eraciones|\.)?|gravad|exonerad|inafect|igv|i\.g\.v|isc|descuento|dscto|anticipo|valor\s+de\s+venta|items?|unidades|cantidad|kg|peso)",
    re.IGNORECASE,
)

_NUMBER_TOKEN = re.compile(r"\d[\d.,]*\d|\d")

# El valor a veces queda en la línea siguiente al rótulo (celda de abajo en
# la exportación de texto); las líneas en blanco no cuentan.
_LOOKAHEAD_LINES = 1


def _compact_letter_spacing(line: str) -> str:
    """Une texto espaciado letra por letra ("T O T A L :   $ 2 5 , 3 0 0" ->
    "TOTAL:$25,300"), un estilo de diseño común en el total de una factura que
    la extracción de texto devuelve con un espacio entre cada carácter."""
    tokens = line.split()
    if len(tokens) >= 4 and sum(len(token) == 1 for token in tokens) / len(tokens) >= 0.8:
        return "".join(tokens)
    return line


def _last_amount(line: str) -> float | None:
    for token in reversed(_NUMBER_TOKEN.findall(line)):
        value = parse_number(token)
        if value is not None and value > 0:
            return value
    return None


def detect_invoice_total(text: str) -> float | None:
    """Mejor esfuerzo: None si ninguna línea rotulada como total trae un monto."""
    if not text:
        return None

    lines = [_compact_letter_spacing(line) for line in text.splitlines() if line.strip()]
    for tier in _LABEL_TIERS:
        amounts: list[float] = []
        for index, line in enumerate(lines):
            if not tier.search(line) or _NOT_GRAND_TOTAL.search(line):
                continue
            # Solo lo que viene DESPUÉS del rótulo: evita tomar un número de
            # la izquierda de la misma fila (ej. una cantidad).
            after_label = line[tier.search(line).end():]
            amount = _last_amount(after_label)
            if amount is None:
                for next_line in lines[index + 1 : index + 1 + _LOOKAHEAD_LINES]:
                    amount = _last_amount(next_line)
                    if amount is not None:
                        break
            if amount is not None:
                amounts.append(amount)
        if amounts:
            # El importe final nunca es menor que otro total parcial que se
            # haya colado con el mismo rótulo.
            return max(amounts)
    return None
