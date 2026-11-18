import { describe, expect, it } from "vitest";
import { publicKnowledgeSources } from "./publicSources";
import type { PublicKnowledgeSource } from "./types";
import { acceptKnowledgeChunkImport, validateKnowledgeChunkImport } from "./ingestion";

const verifiedToyotaSource: PublicKnowledgeSource = {
  ...publicKnowledgeSources.find((source) => source.id === "source-toyota-manuals")!,
  documentStatus: "document_verified",
  verificationStatus: "verified",
};
const testSources = [...publicKnowledgeSources.filter((source) => source.id !== verifiedToyotaSource.id), verifiedToyotaSource];

const validChunk = {
  id: "kb-toyota-corolla-oil-2024",
  text: "Замену масла выполняйте по регламенту для конкретного двигателя и рынка.",
  metadata: {
    heading: "Замена масла", brand: "Toyota", model: "Corolla", generation: "E210", market: "US", yearStart: 2024, yearEnd: 2024,
    engine: "2ZR-FE", engineCode: "2ZR-FE", transmission: "CVT", category: "fluids",
    source: "Toyota Owner Manual", sourceType: "official_manual", sourceId: "source-toyota-manuals",
    reviewedAt: "2026-11-18",
  },
  citation: { locator: "раздел 6, стр. 42", documentHash: "a".repeat(64), sourceUrl: "https://www.toyota.com/owners/warranty-owners-manuals/" },
};

describe("knowledge ingestion validation", () => {
  it("accepts a complete cited excerpt", () => {
    expect(validateKnowledgeChunkImport(validChunk, testSources)).toEqual({ valid: true, errors: [] });
    expect(acceptKnowledgeChunkImport(validChunk, testSources).citation.locator).toContain("стр.");
  });

  it("rejects unknown sources and missing citation data", () => {
    const result = validateKnowledgeChunkImport({ ...validChunk, metadata: { ...validChunk.metadata, sourceId: "missing" }, citation: undefined }, testSources);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(["sourceId отсутствует в реестре источников", "Не указан раздел или страница источника", "documentHash должен быть SHA-256"]));
  });

  it("rejects manual excerpts without exact application scope", () => {
    const { market: _market, ...incomplete } = validChunk.metadata;
    const result = validateKnowledgeChunkImport({ ...validChunk, metadata: incomplete }, testSources);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Для выдержки укажите заголовок, марку, модель, поколение, рынок, годы, двигатель и КПП");
  });

  it("rejects an entry page without a verified manual document", () => {
    const result = validateKnowledgeChunkImport(validChunk, publicKnowledgeSources);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Для рекомендаций разрешены только проверенные документы, не ссылки на страницу каталога");
  });
});
