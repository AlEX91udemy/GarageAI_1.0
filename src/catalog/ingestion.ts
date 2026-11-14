import type { CatalogSource, IngestedKnowledgeChunk, KnowledgeChunk } from "./types";

export interface KnowledgeChunkValidation {
  valid: boolean;
  errors: string[];
}

const isNonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/** Validate an imported excerpt before it is added to the searchable knowledge base. */
export function validateKnowledgeChunkImport(value: unknown, sources: CatalogSource[]): KnowledgeChunkValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, errors: ["Фрагмент должен быть объектом"] };
  const candidate = value as Partial<IngestedKnowledgeChunk>;
  if (!isNonEmpty(candidate.id)) errors.push("Не указан id фрагмента");
  if (!isNonEmpty(candidate.text) || candidate.text.trim().length < 20) errors.push("Текст фрагмента слишком короткий");
  const metadata = candidate.metadata as Partial<KnowledgeChunk["metadata"]> | undefined;
  if (!metadata || typeof metadata !== "object") errors.push("Не указаны metadata фрагмента");
  if (metadata && (!isNonEmpty(metadata.sourceId) || !sources.some((source) => source.id === metadata.sourceId))) errors.push("sourceId отсутствует в реестре источников");
  if (metadata && (!isNonEmpty(metadata.source) || !isNonEmpty(metadata.sourceType))) errors.push("Не указаны название или тип источника");
  const citation = candidate.citation as Partial<IngestedKnowledgeChunk["citation"]> | undefined;
  if (!citation || !isNonEmpty(citation.locator)) errors.push("Не указан раздел или страница источника");
  if (!citation || !/^[a-f0-9]{64}$/i.test(citation.documentHash || "")) errors.push("documentHash должен быть SHA-256");
  return { valid: errors.length === 0, errors };
}

export function acceptKnowledgeChunkImport(value: unknown, sources: CatalogSource[]): IngestedKnowledgeChunk {
  const validation = validateKnowledgeChunkImport(value, sources);
  if (!validation.valid) throw new Error("Фрагмент отклонён: " + validation.errors.join("; "));
  return value as IngestedKnowledgeChunk;
}
