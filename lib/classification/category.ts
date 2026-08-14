import type { ClassificationProvider, ClassificationResult } from "./provider";
import type { CategoryClassificationInput, CategoryCode } from "./category-schema";
import { RuleCategoryProvider } from "./category-rules";
import { OllamaCategoryProvider } from "./ollama-provider";

// Clasificación híbrida (Fase 7): reglas -> confidence -> ¿alta? -> resultado.
// Si no, Ollama -> resultado. No se envía todo a Ollama, solo lo que las
// reglas no resuelven con confianza suficiente.
export const HIGH_CONFIDENCE_THRESHOLD = 0.8;

type CategoryProvider = ClassificationProvider<CategoryClassificationInput, CategoryCode>;

export interface ClassifyCategoryProviders {
  rule?: CategoryProvider;
  ollama?: CategoryProvider;
}

const defaultRuleProvider = new RuleCategoryProvider();
const defaultOllamaProvider = new OllamaCategoryProvider();

export async function classifyCategory(
  input: CategoryClassificationInput,
  providers: ClassifyCategoryProviders = {}
): Promise<ClassificationResult<CategoryCode> | null> {
  const rule = providers.rule ?? defaultRuleProvider;
  const ollama = providers.ollama ?? defaultOllamaProvider;

  const ruleResult = await rule.classify(input);
  if (ruleResult && ruleResult.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return ruleResult;
  }

  return ollama.classify(input);
}
