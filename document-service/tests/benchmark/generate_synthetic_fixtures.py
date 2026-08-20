"""Genera fixtures PDF sintéticas para el benchmark (Fase 52) reproduciendo
patrones de falla YA CONFIRMADOS en producción o en tests unitarios — no PDFs
inventados al azar. Se corre una sola vez a mano para producir el archivo
commiteado en tests/fixtures/; no es parte del runtime de la app ni del
Document Service.

Uso: .venv/Scripts/python.exe tests/benchmark/generate_synthetic_fixtures.py

Nota: usa reportlab, que hoy solo está presente como dependencia transitiva
(no en requirements.txt) — si una limpieza de dependencias futura la
elimina, este generador deja de correr, pero los PDF ya generados y
commiteados en tests/fixtures/ siguen funcionando igual.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


def _build_table_pdf(path: Path, header: list[str], rows: list[list[str]]) -> None:
    doc = SimpleDocTemplate(str(path), pagesize=A4)
    data = [header, *rows]
    table = Table(data, colWidths=[7 * cm, 3 * cm, 3 * cm, 3 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f3a2e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f2f2")]),
            ]
        )
    )
    doc.build([table])


def generate_cantidad_uno_fixture() -> None:
    """Reproduce EXACTO el bug real de producción (Fase 49): factura de
    compra de activos donde la cantidad es 1 en TODAS las filas, lo que hace
    que precio_unitario y total coincidan numéricamente por fila."""
    _build_table_pdf(
        FIXTURES_DIR / "factura-cantidad-uno-sintetica.pdf",
        header=["DESCRIPCIÓN", "PRECIO", "CANTIDAD", "TOTAL"],
        rows=[
            ["Mouse", "25", "1", "25"],
            ["Impresora Hp", "800", "1", "800"],
            ["Proyector", "1,200", "1", "1,200"],
            ["Mesa", "300", "1", "300"],
            ["Sensor electrico", "150", "1", "150"],
            ["camara fotografica", "800", "1", "800"],
            ["camara de video", "2,500", "1", "2,500"],
        ],
    )


if __name__ == "__main__":
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    generate_cantidad_uno_fixture()
    print(f"Fixtures generadas en {FIXTURES_DIR}")
