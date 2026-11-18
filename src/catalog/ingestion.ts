import type { CatalogSource, IngestedKnowledgeChunk, KnowledgeChunk, PublicKnowledgeSource } from "./types";

export interface KnowledgeChunkValidation {
  valid: boolean;
  errors: string[];
}

const isNonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/** Validate an imported excerpt before it is added to the searchable knowledge base. */
export function validateKnowledgeChunkImport(value: unknown, sources: Array<CatalogSource | PublicKnowledgeSource>): KnowledgeChunkValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, errors: ["Фрагмент должен быть объектом"] };
  const candidate = value as Partial<IngestedKnowledgeChunk>;
  if (!isNonEmpty(candidate.id) || !/^[a-z0-9][a-z0-9-]{2,119}$/i.test(candidate.id)) errors.push("id фрагмента должен быть коротким буквенно-цифровым идентификатором");
  if (!isNonEmpty(candidate.text) || candidate.text.trim().length < 20 || candidate.text.length > 20_000) errors.push("Текст фрагмента должен содержать от 20 до 20 000 символов");
  const metadata = candidate.metadata as Partial<KnowledgeChunk["metadata"]> | undefined;
  if (!metadata || typeof metadata !== "object") errors.push("Не указаны metadata фрагмента");
  if (metadata && (!isNonEmpty(metadata.sourceId) || !sources.some((source) => source.id === metadata.sourceId))) errors.push("sourceId отсутствует в реестре источников");
  if (metadata && (!isNonEmpty(metadata.source) || !isNonEmpty(metadata.sourceType))) errors.push("Не указаны название или тип источника");
  const sourceRecord = metadata && sources.find((source) => source.id === metadata.sourceId);
  if (metadata && sourceRecord && metadata.sourceType !== sourceRecord.sourceType) errors.push("Тип фрагмента не совпадает с типом источника");
  if (sourceRecord && "url" in sourceRecord && sourceRecord.sourceType === "official_manual" && sourceRecord.documentStatus !== "document_verified") errors.push("Для рекомендаций разрешены только проверенные документы, не ссылки на страницу каталога");
  if (metadata && metadata.sourceType !== "legacy_catalog" && (!isNonEmpty(metadata.heading) || !isNonEmpty(metadata.brand) || !isNonEmpty(metadata.model) || !isNonEmpty(metadata.generation) || !isNonEmpty(metadata.market) || !Number.isInteger(metadata.yearStart) || !Number.isInteger(metadata.yearEnd) || metadata.yearStart! > metadata.yearEnd! || !isNonEmpty(metadata.engine) || !isNonEmpty(metadata.transmission))) errors.push("Для выдержки укажите заголовок, марку, модель, поколение, рынок, годы, двигатель и КПП");
  const citation = candidate.citation as Partial<IngestedKnowledgeChunk["citation"]> | undefined;
  if (!citation || !isNonEmpty(citation.locator)) errors.push("Не указан раздел или страница источника");
  if (!citation || !/^[a-f0-9]{64}$/i.test(citation.documentHash || "")) errors.push("documentHash должен быть SHA-256");
  if (metadata && metadata.sourceType === "official_manual" && !isNonEmpty(metadata.reviewedAt)) errors.push("Не указана дата проверки выдержки");
  if (citation && citation.sourceUrl !== undefined && (!isNonEmpty(citation.sourceUrl) || !/^https:\/\//i.test(citation.sourceUrl))) errors.push("sourceUrl цитаты должен использовать HTTPS");
  if (citation && metadata && isNonEmpty(metadata.sourceId) && isNonEmpty(citation.sourceUrl)) {
    const source = sources.find((item) => item.id === metadata.sourceId);
    try {
      const sourceHost = source && "url" in source ? new URL(source.url).hostname : source?.sourceUrl ? new URL(source.sourceUrl).hostname : null;
      if (sourceHost && new URL(citation.sourceUrl).hostname !== sourceHost) errors.push("Домен citation.sourceUrl не совпадает с издателем источника");
    } catch {
      errors.push("URL источника или цитаты некорректен");
    }
  }
  return { valid: errors.length === 0, errors };
}

export function acceptKnowledgeChunkImport(value: unknown, sources: Array<CatalogSource | PublicKnowledgeSource>): IngestedKnowledgeChunk {
  const validation = validateKnowledgeChunkImport(value, sources);
  if (!validation.valid) throw new Error("Фрагмент отклонён: " + validation.errors.join("; "));
  return value as IngestedKnowledgeChunk;
}

/** Load a reviewed, project-wide JSON corpus; the runtime API cannot mutate it. */
export function loadReviewedKnowledgeChunks(value: unknown, target: IngestedKnowledgeChunk[], sources: Array<CatalogSource | PublicKnowledgeSource>): { loaded: number; rejected: number } {
  if (!Array.isArray(value)) return { loaded: 0, rejected: 1 };
  const errors = { loaded: 0, rejected: Math.max(0, value.length - 5_000) };
  const ids = new Set(target.map((chunk) => chunk.id));
  for (const item of value.slice(0, 5_000)) {
    try {
      const chunk = acceptKnowledgeChunkImport(item, sources);
      if (ids.has(chunk.id)) { errors.rejected += 1; continue; }
      ids.add(chunk.id);
      target.push(chunk);
      errors.loaded += 1;
    } catch {
      errors.rejected += 1;
    }
  }
  return errors;
}
