from dataclasses import dataclass


@dataclass
class Table:
    """Representación genérica de una tabla, desacoplada de Docling.

    `rows` incluye la fila de encabezado si existe (no se separa aquí);
    la detección de encabezado es responsabilidad de table_detection.
    """

    page: int
    index: int
    rows: list[list[str]]

    @property
    def num_rows(self) -> int:
        return len(self.rows)

    @property
    def num_cols(self) -> int:
        return max((len(row) for row in self.rows), default=0)
