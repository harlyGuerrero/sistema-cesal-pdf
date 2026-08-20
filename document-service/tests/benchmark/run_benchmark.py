"""Benchmark permanente con PDFs reales (Fase 52, ver ARCHITECTURE.md
sección 8). Corre el pipeline completo (Docling -> Table Detection ->
Column Roles -> Product Candidate) sobre cada fixture en tests/fixtures/ y
compara contra su ground truth en tests/fixtures/expected/.

No es un test de pytest: se corre a mano y su salida se versiona en
tests/benchmark/results/. Regla de ARCHITECTURE.md 8: no se afirma precisión
general del sistema basándose solo en estos documentos — esto mide regresión
y compara motores, no generaliza.

Uso:
    .venv/Scripts/python.exe tests/benchmark/run_benchmark.py
    .venv/Scripts/python.exe tests/benchmark/run_benchmark.py --engine docling+vlm  (Fase 53)
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.contracts import ProductCandidate  # noqa: E402
from app.extraction.docling_adapter import extract  # noqa: E402
from app.extraction.pipeline import run_pipeline  # noqa: E402

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
EXPECTED_DIR = FIXTURES_DIR / "expected"
RESULTS_DIR = Path(__file__).parent / "results"

# Tolerancia relativa para considerar dos montos "iguales" — mismo criterio
# que RELATIVE_TOLERANCE en column_roles.py, para no penalizar redondeo.
AMOUNT_TOLERANCE = 0.02


@dataclass
class RowMatch:
    expected_name: str
    candidate: ProductCandidate | None
    name_matched: bool
    quantity_correct: bool
    unit_price_correct: bool
    total_price_correct: bool

    @property
    def fully_correct(self) -> bool:
        return (
            self.name_matched
            and self.quantity_correct
            and self.unit_price_correct
            and self.total_price_correct
        )


@dataclass
class FixtureReport:
    fixture: str
    expectedRows: int
    detectedRows: int
    correctRows: int
    missingRows: int
    mergedRows: int
    extraRows: int
    falsePositives: int
    nameAccuracy: float
    quantityAccuracy: float
    priceAccuracy: float
    totalAccuracy: float
    processingTimeMs: int
    errors: list[str] = field(default_factory=list)


def _close(a: float | None, b: float, tolerance: float = AMOUNT_TOLERANCE) -> bool:
    if a is None:
        return False
    if b == 0:
        return a == 0
    return abs(a - b) / abs(b) <= tolerance


def _normalize_name(name: str) -> str:
    return " ".join(name.strip().upper().split())


def _match_candidates(
    expected_products: list[dict], candidates: list[ProductCandidate]
) -> tuple[list[RowMatch], list[ProductCandidate]]:
    # Emparejamiento 1:1 por nombre normalizado (case/espacios) — los
    # fixtures no tienen nombres duplicados, así que no hace falta un
    # matcher más sofisticado (ej. similitud difusa) todavía.
    remaining = list(candidates)
    matches: list[RowMatch] = []

    for expected in expected_products:
        expected_name = _normalize_name(expected["name"])
        found = next(
            (c for c in remaining if _normalize_name(c.name or "") == expected_name), None
        )
        if found is not None:
            remaining.remove(found)
            matches.append(
                RowMatch(
                    expected_name=expected["name"],
                    candidate=found,
                    name_matched=True,
                    quantity_correct=_close(found.quantity, expected["quantity"]),
                    unit_price_correct=_close(found.unitPrice, expected["unitPrice"]),
                    total_price_correct=_close(found.totalPrice, expected["totalPrice"]),
                )
            )
        else:
            matches.append(
                RowMatch(
                    expected_name=expected["name"],
                    candidate=None,
                    name_matched=False,
                    quantity_correct=False,
                    unit_price_correct=False,
                    total_price_correct=False,
                )
            )

    # remaining = candidatos detectados que no corresponden a ningún producto
    # esperado — filas extra / falsos positivos (ver docstring del módulo).
    return matches, remaining


def run_fixture(pdf_path: Path) -> FixtureReport:
    expected_path = EXPECTED_DIR / f"{pdf_path.stem}.json"
    expected_data = json.loads(expected_path.read_text(encoding="utf-8"))
    expected_products = expected_data["products"]

    content = pdf_path.read_bytes()
    started = time.monotonic()
    errors: list[str] = []
    candidates: list[ProductCandidate] = []
    try:
        _num_pages, tables, _invoice_number = extract(content, pdf_path.name)
        candidates, _summary = run_pipeline(tables)
    except Exception as error:  # noqa: BLE001 - el benchmark reporta, no crashea
        errors.append(str(error))
    elapsed_ms = int((time.monotonic() - started) * 1000)

    matches, extra = _match_candidates(expected_products, candidates)

    expected_rows = len(expected_products)
    detected_rows = len(candidates)
    correct_rows = sum(1 for m in matches if m.fully_correct)
    missing_rows = sum(1 for m in matches if not m.name_matched)
    # "mergedRows" (ARCHITECTURE.md 8): el nombre se detectó pero algún
    # campo numérico salió mal — la fila "se mezcló" con otra o perdió un
    # valor (ej. el bug de Fase 49: nombre correcto, unitPrice incorrecto).
    merged_rows = sum(1 for m in matches if m.name_matched and not m.fully_correct)
    extra_rows = len(extra)

    def field_accuracy(pred: str) -> float:
        matched = [m for m in matches if m.name_matched]
        if not matched:
            return 0.0
        correct = sum(1 for m in matched if getattr(m, pred))
        return round(correct / len(matched), 4)

    return FixtureReport(
        fixture=pdf_path.name,
        expectedRows=expected_rows,
        detectedRows=detected_rows,
        correctRows=correct_rows,
        missingRows=missing_rows,
        mergedRows=merged_rows,
        extraRows=extra_rows,
        # Mismo valor que extraRows: en este runner un "falso positivo" es
        # exactamente una fila detectada que no corresponde a ningún
        # producto esperado — no hay una segunda noción distinta todavía.
        falsePositives=extra_rows,
        nameAccuracy=round(expected_rows and (expected_rows - missing_rows) / expected_rows, 4),
        quantityAccuracy=field_accuracy("quantity_correct"),
        priceAccuracy=field_accuracy("unit_price_correct"),
        totalAccuracy=field_accuracy("total_price_correct"),
        processingTimeMs=elapsed_ms,
        errors=errors,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--label",
        default="docling",
        help="Etiqueta del motor/config corrida (ej. 'docling', 'docling+vlm' en Fase 53).",
    )
    args = parser.parse_args()

    fixtures = sorted(FIXTURES_DIR.glob("*.pdf"))
    if not fixtures:
        print(f"No hay fixtures en {FIXTURES_DIR}")
        return

    reports = [run_fixture(pdf) for pdf in fixtures]

    print(f"\n=== Benchmark ({args.label}) - {len(reports)} fixture(s) ===\n")
    for r in reports:
        status = "OK" if not r.errors else f"ERROR: {r.errors}"
        print(
            f"{r.fixture}: expected={r.expectedRows} detected={r.detectedRows} "
            f"correct={r.correctRows} missing={r.missingRows} merged={r.mergedRows} "
            f"extra={r.extraRows} | name={r.nameAccuracy} qty={r.quantityAccuracy} "
            f"price={r.priceAccuracy} total={r.totalAccuracy} | {r.processingTimeMs}ms | {status}"
        )

    overall = {
        "label": args.label,
        "fixtureCount": len(reports),
        "avgNameAccuracy": round(statistics.mean(r.nameAccuracy for r in reports), 4),
        "avgQuantityAccuracy": round(statistics.mean(r.quantityAccuracy for r in reports), 4),
        "avgPriceAccuracy": round(statistics.mean(r.priceAccuracy for r in reports), 4),
        "avgTotalAccuracy": round(statistics.mean(r.totalAccuracy for r in reports), 4),
        "totalCorrectRows": sum(r.correctRows for r in reports),
        "totalExpectedRows": sum(r.expectedRows for r in reports),
        "fixtures": [asdict(r) for r in reports],
    }

    print(
        f"\nPromedio - name={overall['avgNameAccuracy']} qty={overall['avgQuantityAccuracy']} "
        f"price={overall['avgPriceAccuracy']} total={overall['avgTotalAccuracy']} "
        f"({overall['totalCorrectRows']}/{overall['totalExpectedRows']} filas correctas)"
    )

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RESULTS_DIR / f"{args.label}.json"
    out_path.write_text(json.dumps(overall, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nReporte guardado en {out_path}")


if __name__ == "__main__":
    main()
