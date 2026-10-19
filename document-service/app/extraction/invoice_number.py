"""Detección del N° de factura desde el texto plano del documento (ver skill
document-ai). Estructural, no una lista de proveedores ni coordenadas fijas
(CLAUDE.md regla 3): busca la FORMA de un número de comprobante (grupos
alfanuméricos separados por guion, cerca de una etiqueta reconocible), sin
asumir un formato único de proveedor — cubre tanto el serie-correlativo
SUNAT (F001-00123) como numeraciones internas más libres (FACTURA-55-01898).
"""

import re

# Caso más común y preciso: serie SUNAT de 4 caracteres (el primero suele
# indicar el tipo de comprobante — F factura, B boleta, E nota, pero eso no
# se valida acá, solo la forma) + correlativo de hasta 8 dígitos.
# Ej. F001-00123, E001-12345678.
_SERIE_CORRELATIVO = re.compile(r"\b([A-Z][A-Z0-9]{3}-\d{1,8})\b")

# Fallback genérico: 2 a 4 grupos alfanuméricos separados por guion, con al
# menos un dígito en algún grupo (para no matchear un guion de texto libre).
# Cubre numeraciones internas propias que no siguen el formato SUNAT, ej.
# "FACTURA-55-01898" (Fase 54 — bug real: ese formato no matcheaba nada).
_HYPHENATED_TOKEN = re.compile(r"\b([A-Z0-9]+(?:-[A-Z0-9]+){1,3})\b", re.IGNORECASE)

# Para no confundir una fecha cercana a la etiqueta ("Fecha de factura:
# 20-08-2026") con el número de comprobante.
_DATE_LIKE = re.compile(r"^\d{1,2}-\d{1,2}-\d{2,4}$|^\d{4}-\d{1,2}-\d{1,2}$")

# Línea "ancla": el número casi siempre aparece pegado o a pocas líneas de
# una de estas palabras en el encabezado del comprobante.
_LABEL_LINE = re.compile(r"factura|comprobante|boleta|invoice", re.IGNORECASE)

# Cuántas líneas después de la etiqueta se revisan — el layout del PDF suele
# separar "N° de comprobante" del valor en la celda/línea siguiente.
_LOOKAHEAD_LINES = 3


def _first_hyphenated_candidate(window: str) -> str | None:
    for candidate in _HYPHENATED_TOKEN.finditer(window):
        token = candidate.group(1).upper()
        if _DATE_LIKE.match(token):
            continue
        if not any(char.isdigit() for char in token):
            continue
        return token
    return None


def detect_invoice_number(text: str) -> str | None:
    """Mejor esfuerzo: None si no hay nada con forma de número de comprobante."""
    if not text:
        return None

    lines = text.splitlines()

    for index, line in enumerate(lines):
        if _LABEL_LINE.search(line):
            window = "\n".join(lines[index : index + _LOOKAHEAD_LINES])
            match = _SERIE_CORRELATIVO.search(window)
            if match:
                return match.group(1)
            candidate = _first_hyphenated_candidate(window)
            if candidate:
                return candidate

    # Sin línea de contexto reconocible (ej. OCR perdió la etiqueta): primer
    # match del documento entero, mejor que no ofrecer nada. Solo el patrón
    # SUNAT estricto acá — el fallback genérico sin ancla de etiqueta tiene
    # demasiado riesgo de matchear cualquier código con guion del documento.
    match = _SERIE_CORRELATIVO.search(text)
    return match.group(1) if match else None
