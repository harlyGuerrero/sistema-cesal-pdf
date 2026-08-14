import { describe, expect, it, vi } from "vitest";
import { classifyCategory } from "@/lib/classification/category";
import type { ClassificationProvider, ClassificationResult } from "@/lib/classification/provider";
import type { CategoryClassificationInput, CategoryCode } from "@/lib/classification/category-schema";

type Provider = ClassificationProvider<CategoryClassificationInput, CategoryCode>;

function fakeProvider(result: ClassificationResult<CategoryCode> | null): Provider {
  return { classify: vi.fn().mockResolvedValue(result) };
}

describe("classifyCategory (hybrid)", () => {
  it("returns the rule result and never calls Ollama when rule confidence is high", async () => {
    const rule = fakeProvider({ value: "EQUIPOS_INFORMATICOS", confidence: 0.85, method: "RULE" });
    const ollama = fakeProvider({ value: "BIENES_VEHICULARES", confidence: 0.99, method: "OLLAMA" });

    const result = await classifyCategory({ normalizedName: "LAPTOP HP", name: null }, { rule, ollama });

    expect(result).toEqual({ value: "EQUIPOS_INFORMATICOS", confidence: 0.85, method: "RULE" });
    expect(ollama.classify).not.toHaveBeenCalled();
  });

  it("falls back to Ollama when the rule provider has no answer", async () => {
    const rule = fakeProvider(null);
    const ollama = fakeProvider({ value: "EQUIPOS_DE_MAQUINARIA", confidence: 0.7, method: "OLLAMA" });

    const result = await classifyCategory({ normalizedName: "ALGO RARO", name: null }, { rule, ollama });

    expect(result).toEqual({ value: "EQUIPOS_DE_MAQUINARIA", confidence: 0.7, method: "OLLAMA" });
    expect(rule.classify).toHaveBeenCalledOnce();
  });

  it("falls back to Ollama when rule confidence is below the threshold", async () => {
    const rule = fakeProvider({ value: "MUEBLES_DE_OFICINA", confidence: 0.5, method: "RULE" });
    const ollama = fakeProvider({ value: "MUEBLES_DE_OFICINA", confidence: 0.8, method: "OLLAMA" });

    const result = await classifyCategory({ normalizedName: "ALGO AMBIGUO", name: null }, { rule, ollama });

    expect(result?.method).toBe("OLLAMA");
    expect(ollama.classify).toHaveBeenCalledOnce();
  });

  it("propagates null when neither provider has an answer", async () => {
    const rule = fakeProvider(null);
    const ollama = fakeProvider(null);

    const result = await classifyCategory({ normalizedName: "???", name: null }, { rule, ollama });

    expect(result).toBeNull();
  });

  it("uses the real RuleCategoryProvider by default and never touches the network for clear matches", async () => {
    const ollama = fakeProvider(null);

    const result = await classifyCategory({ normalizedName: "SILLA GERENCIAL", name: null }, { ollama });

    expect(result?.value).toBe("MUEBLES_DE_OFICINA");
    expect(ollama.classify).not.toHaveBeenCalled();
  });
});
