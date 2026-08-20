from app.extraction.invoice_number import detect_invoice_number
from app.extraction.models import Table
from app.extraction.parsing import is_numeric_cell, parse_number
from app.extraction.pipeline import run_pipeline
from app.extraction.table_detection import select_product_table


def test_parse_number_formats():
    assert parse_number("1500") == 1500.0
    assert parse_number("1,500.00") == 1500.0
    assert parse_number("1.500,00") == 1500.0
    assert parse_number("S/ 1,500.00") == 1500.0
    assert parse_number("") is None
    assert parse_number("Subtotal:") is None
    assert parse_number(None) is None


def test_is_numeric_cell_distinguishes_numbers_from_text_containing_digits():
    """Bug real de Fase 9: un nombre de producto con modelo ("LATITUDE 5420",
    "2000VA") no debe contar como celda numérica al clasificar columnas, o la
    columna de descripción parece numérica y la tabla se descarta entera."""
    assert is_numeric_cell("3200.00") is True
    assert is_numeric_cell("1") is True
    assert is_numeric_cell("S/ 1,500.00") is True
    assert is_numeric_cell("1500.00 PEN") is True
    assert is_numeric_cell("-140.00") is True
    assert is_numeric_cell("LAPTOP DELL LATITUDE 5420") is False
    assert is_numeric_cell("ESTABILIZADOR DE VOLTAJE 2000VA") is False
    assert is_numeric_cell("") is False
    assert is_numeric_cell(None) is False


def test_detect_invoice_number_finds_serie_correlativo_near_label():
    text = "FACTURA ELECTRONICA\nF001-00123\nCliente: ACME SAC"
    assert detect_invoice_number(text) == "F001-00123"


def test_detect_invoice_number_label_and_value_on_same_line():
    text = "Comprobante: E001-12345678"
    assert detect_invoice_number(text) == "E001-12345678"


def test_detect_invoice_number_falls_back_without_label():
    text = "Encabezado sin etiqueta reconocible\nB0A1-9\nResto del documento"
    assert detect_invoice_number(text) == "B0A1-9"


def test_detect_invoice_number_none_when_no_match():
    assert detect_invoice_number("Documento sin numeración de comprobante") is None
    assert detect_invoice_number("") is None


def test_detect_invoice_number_prefers_match_near_label_over_earlier_noise():
    """RUC (11 dígitos, sin guion) no matchea el patrón, pero un código de
    proyecto con la misma forma sí podría aparecer antes en el documento —
    la ventana de contexto junto a la etiqueta gana sobre el primer match."""
    text = "Código de proyecto: PR01-99999\n...\nFactura N°: F001-00456"
    assert detect_invoice_number(text) == "F001-00456"


def test_is_numeric_cell_recognizes_trailing_currency_symbols():
    """Bug real: facturas con precio formateado como '1500 €' (símbolo de
    moneda al final, no código ISO) no eran reconocidas como columna numérica
    -> ninguna columna de precio pasaba el umbral -> 0 candidatos en toda la
    tabla, aunque la tabla y los datos fueran perfectamente válidos."""
    assert is_numeric_cell("1500 €") is True
    assert is_numeric_cell("1500€") is True
    assert is_numeric_cell("1500 S/") is True
    assert is_numeric_cell("1500 $") is True


def test_detects_product_table_with_trailing_currency_symbol():
    table = Table(
        page=1,
        index=0,
        rows=[
            ["CONCEPTO", "CANTIDAD", "PRECIO", "TOTAL"],
            ["MONITOR TEROS", "1", "1500 €", "1500 €"],
            ["IMPRESORA CANON", "1", "900 €", "900 €"],
            ["Forma de pago: Transferencia", "", "SUBTOTAL", "2400 €"],
        ],
    )

    candidates, summary = run_pipeline([table])

    assert summary[0]["isProductTable"] is True
    assert len(candidates) == 2
    names = {c.name for c in candidates}
    assert names == {"MONITOR TEROS", "IMPRESORA CANON"}


def test_detects_product_table_with_model_numbers_in_description():
    """Reproduce el bug de Fase 9 de punta a punta: sin el fix, esta tabla se
    descartaba entera porque la columna de descripción parecía numérica."""
    table = Table(
        page=1,
        index=0,
        rows=[
            ["DESCRIPCIÓN", "CANTIDAD", "PRECIO UNITARIO", "IMPORTE"],
            ["LAPTOP DELL LATITUDE 5420", "1", "3200.00", "3200.00"],
            ["ESTABILIZADOR DE VOLTAJE 2000VA", "2", "450.00", "900.00"],
            ["Subtotal", "", "", "4100.00"],
            ["IVA", "", "", "738.00"],
        ],
    )

    candidates, summary = run_pipeline([table])

    assert summary[0]["isProductTable"] is True
    assert len(candidates) == 2
    names = {c.name for c in candidates}
    assert names == {"LAPTOP DELL LATITUDE 5420", "ESTABILIZADOR DE VOLTAJE 2000VA"}


def test_rejects_non_product_rows_regardless_of_header_wording():
    """Replica los ejemplos de la Fase 4: solo la fila de producto real debe
    convertirse en ProductCandidate; IBAN/NIF/Notas/Subtotal/IVA/IRPF no."""
    table = Table(
        page=1,
        index=0,
        rows=[
            ["DESCRIPCIÓN", "CANTIDAD", "PRECIO UNITARIO", "IMPORTE"],
            ["MONITOR TEROS", "1", "1500", "1500"],
            ["IBAN: ES1234567890", "", "", ""],
            ["NIF: 123456789", "", "", ""],
            ["Notas:", "", "", ""],
            ["Subtotal:", "", "", "1500"],
            ["IVA:", "", "", "270"],
            ["IRPF:", "", "", "-150"],
        ],
    )

    candidates, summary = run_pipeline([table])

    assert len(candidates) == 1
    assert candidates[0].name == "MONITOR TEROS"
    assert candidates[0].quantity == 1
    assert candidates[0].unitPrice == 1500
    assert candidates[0].totalPrice == 1500
    assert candidates[0].confidence >= 0.9
    assert summary[0]["isProductTable"] is True


def test_detects_product_table_with_different_header_wording():
    """Distintos encabezados (ARTÍCULO/CANT./P.UNIT/IMPORTE) deben funcionar
    igual: la detección es estructural, no por palabra de encabezado."""
    table = Table(
        page=1,
        index=0,
        rows=[
            ["ARTÍCULO", "CANT.", "P.UNIT", "IMPORTE"],
            ["TECLADO MECÁNICO", "2", "250.00", "500.00"],
            ["SILLA ERGONÓMICA", "3", "800.00", "2400.00"],
        ],
    )

    candidates, _ = run_pipeline([table])

    assert len(candidates) == 2
    names = {c.name for c in candidates}
    assert names == {"TECLADO MECÁNICO", "SILLA ERGONÓMICA"}
    quantities = {c.name: c.quantity for c in candidates}
    assert quantities["TECLADO MECÁNICO"] == 2
    assert quantities["SILLA ERGONÓMICA"] == 3


def test_selects_product_table_over_decoy_info_table():
    decoy = Table(
        page=1,
        index=0,
        rows=[
            ["Emisor", "Acme SAC"],
            ["RUC", "20123456789"],
            ["Fecha", "01/01/2026"],
        ],
    )
    product_table = Table(
        page=1,
        index=1,
        rows=[
            ["PRODUCTO", "CANTIDAD", "VALOR UNITARIO", "TOTAL"],
            ["LAPTOP DELL", "1", "3500", "3500"],
            ["MOUSE INALÁMBRICO", "4", "45", "180"],
        ],
    )

    selected, header_idx = select_product_table([decoy, product_table])

    assert selected is product_table
    assert header_idx == 0


def test_resolves_unit_price_when_quantity_is_one_in_every_row():
    """Bug real de producción: una factura con cantidad=1 en TODAS las filas
    hace que precio_unitario y total sean numéricamente idénticos por fila,
    así que cantidad*precio=total se cumple igual sin importar cuál columna
    se llame cantidad y cuál precio. Sin desempate, el resultado dependía del
    orden de iteración de itertools.permutations y unitPrice salía guardado
    como 1 (el valor de la columna cantidad) en las 7 filas."""
    table = Table(
        page=1,
        index=0,
        rows=[
            ["DESCRIPCIÓN", "PRECIO", "CANTIDAD", "TOTAL"],
            ["Mouse", "25", "1", "25"],
            ["Impresora Hp", "800", "1", "800"],
            ["Proyector", "1,200", "1", "1,200"],
            ["Mesa", "300", "1", "300"],
            ["Sensor electrico", "150", "1", "150"],
            ["camara fotografica", "800", "1", "800"],
            ["camara de video", "2,500", "1", "2,500"],
        ],
    )

    candidates, summary = run_pipeline([table])

    assert summary[0]["isProductTable"] is True
    assert len(candidates) == 7
    by_name = {c.name: c for c in candidates}

    assert by_name["Mouse"].quantity == 1
    assert by_name["Mouse"].unitPrice == 25
    assert by_name["Mouse"].totalPrice == 25

    assert by_name["Proyector"].quantity == 1
    assert by_name["Proyector"].unitPrice == 1200
    assert by_name["Proyector"].totalPrice == 1200

    assert by_name["camara de video"].quantity == 1
    assert by_name["camara de video"].unitPrice == 2500
    assert by_name["camara de video"].totalPrice == 2500

    # La magnitud (cantidad ~1, precio/total en cientos) resuelve cuál
    # columna es cantidad sin ambigüedad real, así que la confianza se
    # mantiene alta pese al empate matemático de _score_triple.
    assert all(c.confidence >= 0.9 for c in candidates)


def test_key_value_table_yields_no_candidates():
    """Una tabla clave-valor (sin columna de cantidad independiente) no debe
    producir productos, aunque alguna columna parezca numérica (ej. RUC)."""
    decoy = Table(
        page=1,
        index=0,
        rows=[
            ["Emisor", "Acme SAC"],
            ["RUC", "20123456789"],
        ],
    )

    candidates, _ = run_pipeline([decoy])

    assert candidates == []
