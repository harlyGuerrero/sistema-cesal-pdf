"""Test del runner del benchmark en sí (Fase 52) — sin esto, un runner que
siempre reporta 100% de accuracy sería indistinguible de uno que de verdad
compara contra el ground truth."""

from app.contracts import ProductCandidate, ProductSource
from tests.benchmark.run_benchmark import _match_candidates


def _candidate(name: str, quantity: float, unit_price: float, total_price: float) -> ProductCandidate:
    return ProductCandidate(
        rawText=f"{name} | {quantity} | {unit_price} | {total_price}",
        name=name,
        quantity=quantity,
        unitPrice=unit_price,
        totalPrice=total_price,
        currency=None,
        source=ProductSource(page=1, table=0, row=0),
        confidence=0.95,
    )


def test_match_candidates_detects_missing_wrong_and_extra_rows():
    expected = [
        {"name": "Mouse", "quantity": 1, "unitPrice": 25, "totalPrice": 25},
        {"name": "Proyector", "quantity": 1, "unitPrice": 1200, "totalPrice": 1200},
        {"name": "Mesa", "quantity": 1, "unitPrice": 300, "totalPrice": 300},
    ]
    candidates = [
        _candidate("Mouse", 1, 25, 25),  # correcto
        _candidate("Proyector", 1, 1, 1200),  # nombre ok, unitPrice mal (el bug real)
        _candidate("Silla", 2, 400, 800),  # no está en expected -> extra
        # "Mesa" no aparece entre los candidatos -> missing
    ]

    matches, extra = _match_candidates(expected, candidates)

    by_name = {m.expected_name: m for m in matches}
    assert by_name["Mouse"].fully_correct is True
    assert by_name["Proyector"].name_matched is True
    assert by_name["Proyector"].unit_price_correct is False
    assert by_name["Proyector"].fully_correct is False
    assert by_name["Mesa"].name_matched is False

    assert len(extra) == 1
    assert extra[0].name == "Silla"
