from ..contracts import ProductCandidate
from .column_roles import assign_column_roles
from .models import Table
from .product_candidate import rows_to_candidates
from .table_detection import select_product_table


def run_pipeline(tables: list[Table]) -> tuple[list[ProductCandidate], list[dict]]:
    product_table, header_idx = select_product_table(tables)

    summary = [
        {
            "page": t.page,
            "index": t.index,
            "rows": t.num_rows,
            "cols": t.num_cols,
            "isProductTable": product_table is not None and t is product_table,
        }
        for t in tables
    ]

    if product_table is None:
        return [], summary

    start = header_idx + 1 if header_idx is not None else 0
    data_rows = product_table.rows[start:]
    roles = assign_column_roles(data_rows, product_table.num_cols)
    candidates = rows_to_candidates(product_table, header_idx, roles)

    return candidates, summary
