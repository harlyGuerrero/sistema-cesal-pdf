import { describe, expect, it } from "vitest";
import {
  computeHash,
  MAX_FILE_SIZE_BYTES,
  PdfValidationError,
  validateUpload,
} from "@/lib/security/pdf-validation";

function pdfBuffer(bytes = 100): Buffer {
  return Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(bytes)]);
}

describe("validateUpload", () => {
  it("accepts a well-formed PDF", () => {
    expect(() => validateUpload("factura.pdf", "application/pdf", pdfBuffer())).not.toThrow();
  });

  it("rejects a non-.pdf extension", () => {
    expect(() => validateUpload("factura.txt", "application/pdf", pdfBuffer())).toThrow(
      PdfValidationError
    );
  });

  it("rejects a wrong MIME type", () => {
    expect(() => validateUpload("factura.pdf", "text/plain", pdfBuffer())).toThrow(
      PdfValidationError
    );
  });

  it("rejects an empty file", () => {
    expect(() => validateUpload("factura.pdf", "application/pdf", Buffer.alloc(0))).toThrow(
      PdfValidationError
    );
  });

  it("rejects a file over the size limit", () => {
    const oversized = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(MAX_FILE_SIZE_BYTES)]);
    expect(() => validateUpload("factura.pdf", "application/pdf", oversized)).toThrow(
      PdfValidationError
    );
  });

  it("rejects a file with a valid extension/MIME but a fake signature", () => {
    const fake = Buffer.from("esto no es un pdf");
    expect(() => validateUpload("factura.pdf", "application/pdf", fake)).toThrow(PdfValidationError);
  });
});

describe("computeHash", () => {
  it("is deterministic and content-sensitive", () => {
    const a = computeHash(pdfBuffer(10));
    const b = computeHash(pdfBuffer(10));
    const c = computeHash(pdfBuffer(20));

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
