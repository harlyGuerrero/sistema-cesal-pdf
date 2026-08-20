from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_MINIMAL_PDF = b"%PDF-1.4\n%%EOF"


def _upload(content: bytes = _MINIMAL_PDF):
    return client.post(
        "/v1/documents/process",
        files={"file": ("factura.pdf", content, "application/pdf")},
    )


def test_run_pipeline_failure_returns_controlled_500_not_a_crash():
    """run_pipeline corre fuera del try/except de Docling (línea ~34-48 de
    main.py) — antes, una excepción ahí era un 500 no controlado de FastAPI.
    Docling convirtió el PDF sin problema; el error es nuestro (heurística),
    no del archivo de entrada, así que debe distinguirse del 422 de arriba."""
    with (
        patch("app.main.extract", return_value=(1, [], None)),
        patch("app.main.run_pipeline", side_effect=RuntimeError("boom")),
    ):
        response = _upload()

    assert response.status_code == 500
    assert "boom" in response.json()["detail"]


def test_docling_conversion_failure_returns_422():
    with patch("app.main.extract", side_effect=Exception("PDF corrupto")):
        response = _upload()

    assert response.status_code == 422


def test_invalid_signature_returns_400_before_touching_docling():
    response = _upload(content=b"not a pdf")
    assert response.status_code == 400
