export interface AiConfigurationEnvironment {
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_RECEIPT_API_KEY?: string;
  OPENROUTER_DOCUMENT_API_KEY?: string;
  GOOGLE_GENAI_USE_VERTEXAI?: string;
  GOOGLE_CLOUD_PROJECT?: string;
}

function hasVertexConfiguration(env: AiConfigurationEnvironment): boolean {
  return (
    env.GOOGLE_GENAI_USE_VERTEXAI === "true" &&
    typeof env.GOOGLE_CLOUD_PROJECT === "string" &&
    env.GOOGLE_CLOUD_PROJECT.trim().length > 0
  );
}

function hasNonEmptyKey(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Gemini API-key or Vertex AI/ADC configuration is required by endpoints that
 * call the Google GenAI SDK directly.
 */
export function hasGeminiConfiguration(env: AiConfigurationEnvironment): boolean {
  return hasNonEmptyKey(env.GEMINI_API_KEY) || hasVertexConfiguration(env);
}

/**
 * The application also has OpenRouter-backed OCR endpoints, so this broader
 * predicate must not be used to gate routes that call the Gemini SDK directly.
 */
export function hasAiConfiguration(env: AiConfigurationEnvironment): boolean {
  return (
    hasGeminiConfiguration(env) ||
    hasNonEmptyKey(env.OPENROUTER_API_KEY) ||
    hasNonEmptyKey(env.OPENROUTER_RECEIPT_API_KEY) ||
    hasNonEmptyKey(env.OPENROUTER_DOCUMENT_API_KEY)
  );
}
