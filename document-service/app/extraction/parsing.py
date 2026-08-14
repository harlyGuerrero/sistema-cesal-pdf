"""Parseo tolerante de números en celdas de tabla.

Soporta separador decimal '.' o ',' (formato US o latino/europeo), símbolos de
moneda y espacios. Ver skill pdf-extraction: si no se puede parsear con
confianza, se devuelve None en vez de forzar un valor.
"""

import re

_DIGIT_CHARS = re.compile(r"[^\d.,\-]")


def parse_number(text: str | None) -> float | None:
    if text is None:
        return None
    cleaned = _DIGIT_CHARS.sub("", text.strip())
    if not cleaned or not re.search(r"\d", cleaned):
        return None

    has_comma = "," in cleaned
    has_dot = "." in cleaned

    if has_comma and has_dot:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif has_comma:
        parts = cleaned.split(",")
        if len(parts) == 2 and len(parts[1]) in (1, 2):
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")

    try:
        return float(cleaned)
    except ValueError:
        return None


def is_integer_like(value: float, tolerance: float = 1e-6) -> bool:
    return abs(value - round(value)) < tolerance


_LEADING_CURRENCY = re.compile(r"^(S/\.?|US\$|\$|€)\s*", re.IGNORECASE)
_TRAILING_CURRENCY = re.compile(r"\s+(PEN|USD|EUR|SOLES)$", re.IGNORECASE)
_PURE_NUMBER = re.compile(r"^-?\d[\d.,]*$")


def is_numeric_cell(text: str | None) -> bool:
    """Si la celda ES un número (con decoración de moneda conocida), no si
    simplemente CONTIENE dígitos.

    Usada solo para clasificar columnas (Product Table Detection / column
    roles) — parse_number, más permisivo, se usa para extraer el valor una
    vez que ya se sabe que la columna es numérica. Sin esto, un nombre de
    producto con modelo ("LAPTOP LATITUDE 5420", "ESTABILIZADOR 2000VA")
    hace parecer numérica a la columna de descripción y la tabla se
    descarta entera — bug real encontrado en Fase 9.
    """
    if text is None:
        return False
    stripped = text.strip()
    if not stripped:
        return False
    without_leading = _LEADING_CURRENCY.sub("", stripped)
    without_trailing = _TRAILING_CURRENCY.sub("", without_leading).strip()
    return bool(_PURE_NUMBER.match(without_trailing))
