import { describe, expect, it, vi } from "vitest";
import { OllamaCategoryProvider } from "@/lib/classification/ollama-provider";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

describe("OllamaCategoryProvider", () => {
  it("parses and validates a well-formed structured response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        message: { content: JSON.stringify({ category: "EQUIPOS_INFORMATICOS", confidence: 0.9 }) },
      })
    );
    const provider = new OllamaCategoryProvider({ fetchImpl });

    const result = await provider.classify({ normalizedName: "LAPTOP HP", name: null });

    expect(result).toEqual({ value: "EQUIPOS_INFORMATICOS", confidence: 0.9, method: "OLLAMA" });
  });

  it("never trusts free text: rejects a category outside the closed enum", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        message: { content: JSON.stringify({ category: "OTROS", confidence: 0.9 }) },
      })
    );
    const provider = new OllamaCategoryProvider({ fetchImpl });

    const result = await provider.classify({ normalizedName: "ALGO", name: null });

    expect(result).toBeNull();
  });

  it("returns null when the model content is not valid JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ message: { content: "claro, aquí está la clasificación: EQUIPOS_INFORMATICOS" } })
    );
    const provider = new OllamaCategoryProvider({ fetchImpl });

    const result = await provider.classify({ normalizedName: "LAPTOP HP", name: null });

    expect(result).toBeNull();
  });

  it("returns null when Ollama responds with a non-ok status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false));
    const provider = new OllamaCategoryProvider({ fetchImpl });

    const result = await provider.classify({ normalizedName: "LAPTOP HP", name: null });

    expect(result).toBeNull();
  });

  it("returns null instead of throwing when Ollama is unreachable", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const provider = new OllamaCategoryProvider({ fetchImpl });

    const result = await provider.classify({ normalizedName: "LAPTOP HP", name: null });

    expect(result).toBeNull();
  });

  it("returns null without calling the network when there is no name", async () => {
    const fetchImpl = vi.fn();
    const provider = new OllamaCategoryProvider({ fetchImpl });

    const result = await provider.classify({ normalizedName: null, name: null });

    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
