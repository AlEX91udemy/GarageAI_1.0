export interface AiConfigurationEnvironment {
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_RECEIPT_API_KEY?: string;
  OPENROUTER_DOCUMENT_API_KEY?: string;
  GOOGLE_GENAI_USE_VERTEXAI?: string;
  GOOGLE_CLOUD_PROJECT?: string;
}

/**
 * The Vertex AI SDK path authenticates through Application Default Credentials
 * and does not require GEMINI_API_KEY. Require a project ID to avoid reporting
 * a usable Vertex configuration when the SDK cannot identify the project.
 */
export function hasAiConfiguration(env: AiConfigurationEnvironment): boolean {
  const hasApiKey = [
    env.GEMINI_API_KEY,
    env.OPENROUTER_API_KEY,
    env.OPENROUTER_RECEIPT_API_KEY,
    env.OPENROUTER_DOCUMENT_API_KEY,
  ].some((value) => typeof value === "string" && value.trim().length > 0);

  const hasVertexConfiguration =
    env.GOOGLE_GENAI_USE_VERTEXAI === "true" &&
    typeof env.GOOGLE_CLOUD_PROJECT === "string" &&
    env.GOOGLE_CLOUD_PROJECT.trim().length > 0;

  return hasApiKey || hasVertexConfiguration;
}
