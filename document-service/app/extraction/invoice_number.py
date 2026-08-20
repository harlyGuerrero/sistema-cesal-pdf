"""Detección del N° de factura desde el texto plano del documento (ver skill
document-ai). Estructural, no una lista de proveedores ni coordenadas fijas
(CLAUDE.md regla 3): busca el formato de numeración serie-correlativo que usa
cualquier comprobante electrónico peruano (SUNAT), sin importar quién lo
emitió — funciona igual para una factura, boleta o nota de crédito/débito.
"""

import re

# Serie: 4 caracteres alfanuméricos (el primero suele indicar el tipo de
# comprobante — F factura, B boleta, E nota — pero eso no se valida acá,
# solo la forma). Correlativo: hasta 8 dígitos. Ej. F001-00123, E001-12345678.
_SERIE_CORRELATIVO = re.compile(r"\b([A-Z][A-Z0-9]{3}-\d{1,8})\b")

# Línea "ancla": el número casi siempre aparece pegado o a pocas líneas de
# una de estas palabras en el encabezado del comprobante.
_LABEL_LINE = re.compile(r"factura|comprobante|boleta|invoice", re.IGNORECASE)

# Cuántas líneas después de la etiqueta se revisan — el layout del PDF suele
# separar "N° de comprobante" del valor en la celda/línea siguiente.
_LOOKAHEAD_LINES = 3


def detect_invoice_number(text: str) -> str | None:
    """Mejor esfuerzo: None si no hay nada con forma de serie-correlativo."""
    if not text:
        return None

    lines = text.splitlines()

    for index, line in enumerate(lines):
        if _LABEL_LINE.search(line):
            window = "\n".join(lines[index : index + _LOOKAHEAD_LINES])
            match = _SERIE_CORRELATIVO.search(window)
            if match:
                return match.group(1)

    # Sin línea de contexto reconocible (ej. OCR perdió la etiqueta): primer
    # match del documento entero, mejor que no ofrecer nada.
    match = _SERIE_CORRELATIVO.search(text)
    return match.group(1) if match else None
