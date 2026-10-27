import { describe, expect, it } from "vitest";
import { hasAiConfiguration } from "./aiConfig";

describe("AI backend configuration", () => {
  it("accepts a configured Gemini API key", () => {
    expect(hasAiConfiguration({ GEMINI_API_KEY: "test-key" })).toBe(true);
  });

  it("accepts each supported OpenRouter key configuration", () => {
    expect(hasAiConfiguration({ OPENROUTER_API_KEY: "test-key" })).toBe(true);
    expect(hasAiConfiguration({ OPENROUTER_RECEIPT_API_KEY: "test-key" })).toBe(true);
    expect(hasAiConfiguration({ OPENROUTER_DOCUMENT_API_KEY: "test-key" })).toBe(true);
  });

  it("accepts Vertex AI with project credentials and no API key", () => {
    expect(hasAiConfiguration({
      GOOGLE_GENAI_USE_VERTEXAI: "true",
      GOOGLE_CLOUD_PROJECT: "garageai-test-project",
    })).toBe(true);
  });

  it("does not accept Vertex AI without an explicit project", () => {
    expect(hasAiConfiguration({ GOOGLE_GENAI_USE_VERTEXAI: "true" })).toBe(false);
    expect(hasAiConfiguration({ GOOGLE_GENAI_USE_VERTEXAI: "false", GOOGLE_CLOUD_PROJECT: "garageai-test-project" })).toBe(false);
  });

  it("rejects missing or whitespace-only credentials", () => {
    expect(hasAiConfiguration({})).toBe(false);
    expect(hasAiConfiguration({
      GEMINI_API_KEY: "   ",
      OPENROUTER_API_KEY: "",
      GOOGLE_GENAI_USE_VERTEXAI: "true",
      GOOGLE_CLOUD_PROJECT: "   ",
    })).toBe(false);
  });
});
