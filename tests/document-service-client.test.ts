import { describe, expect, it, vi } from "vitest";
import { DocumentServiceError, processDocument } from "@/lib/document-service/client";

const VALID_RESPONSE = {
  document: { pages: 1 },
  tables: [{ page: 1, index: 0, rows: 2, cols: 4, isProductTable: true }],
  products: [
    {
      rawText: "MONITOR TEROS | 1 | 1500 | 1500",
      name: "MONITOR TEROS",
      quantity: 1,
      unitPrice: 1500,
      totalPrice: 1500,
      currency: null,
      source: { page: 1, table: 0, row: 1 },
      confidence: 0.95,
    },
  ],
  metrics: { fileHash: "abc123", fileSizeBytes: 100, processingTimeMs: 10, engine: "DOCLING" },
};

function fetchReturning(body: unknown, ok = true, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as typeof fetch;
}

describe("processDocument", () => {
  it("returns the parsed response when it matches the contract", async () => {
    const fetchImpl = fetchReturning(VALID_RESPONSE);

    const result = await processDocument(Buffer.from("pdf"), "factura.pdf", "application/pdf", {
      fetchImpl,
    });

    expect(result.products).toHaveLength(1);
    expect(result.metrics.engine).toBe("DOCLING");
  });

  it("throws DocumentServiceError on a non-ok response", async () => {
    const fetchImpl = fetchReturning({ detail: "boom" }, false, 500);

    await expect(
      processDocument(Buffer.from("pdf"), "factura.pdf", "application/pdf", { fetchImpl })
    ).rejects.toThrow(DocumentServiceError);
  });

  it("throws DocumentServiceError when the response violates the contract", async () => {
    const fetchImpl = fetchReturning({ document: { pages: "not-a-number" } });

    await expect(
      processDocument(Buffer.from("pdf"), "factura.pdf", "application/pdf", { fetchImpl })
    ).rejects.toThrow(DocumentServiceError);
  });

  it("throws DocumentServiceError when the service is unreachable", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      processDocument(Buffer.from("pdf"), "factura.pdf", "application/pdf", { fetchImpl })
    ).rejects.toThrow(DocumentServiceError);
  });
});
