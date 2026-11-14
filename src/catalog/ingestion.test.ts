import { describe, expect, it } from "vitest";
import { catalogSources } from "./database";
import { acceptKnowledgeChunkImport, validateKnowledgeChunkImport } from "./ingestion";

const validChunk = {
  id: "kb-toyota-corolla-oil-2024",
  text: "Замену масла выполняйте по регламенту для конкретного двигателя и рынка.",
  metadata: {
    brand: "Toyota", model: "Corolla", generation: "E210", yearStart: 2024, yearEnd: 2024,
    engine: "2ZR-FE", engineCode: "2ZR-FE", transmission: null, category: "fluids",
    source: "Toyota Owner Manual", sourceType: "official_manual", sourceId: "source-legacy-catalog",
  },
  citation: { locator: "раздел 6, стр. 42", documentHash: "a".repeat(64) },
};

describe("knowledge ingestion validation", () => {
  it("accepts a complete cited excerpt", () => {
    expect(validateKnowledgeChunkImport(validChunk, catalogSources)).toEqual({ valid: true, errors: [] });
    expect(acceptKnowledgeChunkImport(validChunk, catalogSources).citation.locator).toContain("стр.");
  });

  it("rejects unknown sources and missing citation data", () => {
    const result = validateKnowledgeChunkImport({ ...validChunk, metadata: { ...validChunk.metadata, sourceId: "missing" }, citation: undefined }, catalogSources);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(["sourceId отсутствует в реестре источников", "Не указан раздел или страница источника", "documentHash должен быть SHA-256"]));
  });
});
