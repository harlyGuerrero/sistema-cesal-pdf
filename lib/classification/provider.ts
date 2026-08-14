// Abstracción genérica de clasificación (ver skill ollama, Fase 7). La
// aplicación depende de esta interfaz, nunca directamente de Ollama — permite
// cambiar de motor/modelo sin tocar el código que la consume.

export interface ClassificationResult<TValue extends string> {
  value: TValue;
  confidence: number;
  method: "RULE" | "OLLAMA";
}

export interface ClassificationProvider<TInput, TValue extends string> {
  // null = este proveedor no tiene respuesta (sin match de reglas, o Ollama
  // no disponible/timeout) — nunca se inventa un valor de baja confianza.
  classify(input: TInput): Promise<ClassificationResult<TValue> | null>;
}
