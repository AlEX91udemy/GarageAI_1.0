import type { ApplicableKnowledgeContext, IngestedKnowledgeChunk, KnowledgeChunk } from "./types";
import { catalogSources } from "./database";
import { publicKnowledgeSources } from "./publicSources";
import { ingestedKnowledgeChunks } from "./ingestedKnowledge";

const source = catalogSources[0];
export const knowledgeChunks: KnowledgeChunk[] = [
  {
    id: "kb-safety-001",
    text: "При признаках отказа тормозов, проблемах с рулевым управлением, перегреве, утечке топлива или срабатывании подушек безопасности эксплуатацию следует прекратить и обратиться в сервис. Это правило безопасности, а не диагноз конкретной неисправности.",
    metadata: { brand: null, model: null, generation: null, market: null, yearStart: null, yearEnd: null, engine: null, engineCode: null, transmission: null, category: "safety", source: source.source, sourceType: source.sourceType, sourceId: source.id },
  },
  {
    id: "kb-provenance-001",
    text: "Каталожные параметры Garage AI, импортированные из legacy-каталога, требуют проверки по руководству производителя для конкретного рынка, года, двигателя и коробки передач. При конфликте источников приоритет имеет официальный документ.",
    metadata: { brand: null, model: null, generation: null, market: null, yearStart: null, yearEnd: null, engine: null, engineCode: null, transmission: null, category: "specifications", source: source.source, sourceType: source.sourceType, sourceId: source.id },
  },
];

export { ingestedKnowledgeChunks } from "./ingestedKnowledge";

// Only reviewed excerpts belong here. A downloaded PDF or an entry-page URL by
// itself is not a knowledge chunk and must never be presented as evidence.
const normalize = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "") : "";
const normalizeGeneration = (value: string) => normalize(value.replace(/\([^)]*\)/g, ""));

function matchesGeneration(documentGeneration: string, vehicleGeneration: string): boolean {
  const documentId = normalizeGeneration(documentGeneration);
  const vehicleId = normalizeGeneration(vehicleGeneration);
  if (documentId === vehicleId) return true;
  // The vehicle selector stores T32 while a market manual may identify its
  // exact family as T32-A. Other vehicle dimensions below must still match.
  return /^[a-z]*t\d{2,3}[a-z]$/.test(documentId) && documentId.slice(0, -1) === vehicleId;
}

function containsCode(value: string, code: string): boolean {
  const normalizedValue = value.toLowerCase();
  const normalizedCode = code.toLowerCase();
  let index = normalizedValue.indexOf(normalizedCode);
  while (index >= 0) {
    const before = index === 0 ? "" : normalizedValue[index - 1];
    const afterIndex = index + normalizedCode.length;
    const after = afterIndex >= normalizedValue.length ? "" : normalizedValue[afterIndex];
    if ((!before || !/[a-z0-9]/i.test(before)) && (!after || !/[a-z0-9]/i.test(after))) return true;
    index = normalizedValue.indexOf(normalizedCode, index + 1);
  }
  return false;
}

function matchesEngine(chunk: IngestedKnowledgeChunk, vehicleEngine: string): boolean {
  const code = chunk.metadata.engineCode?.trim();
  return code ? containsCode(vehicleEngine, code) : normalize(chunk.metadata.engine) === normalize(vehicleEngine);
}

function matchesTransmission(documentTransmission: string, vehicleTransmission: string): boolean {
  const expected = normalize(documentTransmission);
  const actual = normalize(vehicleTransmission);
  if (expected === actual) return true;
  if (expected !== "cvt") return false;
  return !/(^|[^a-z0-9])e[\s-]*cvt([^a-z0-9]|$)/i.test(vehicleTransmission)
    && /(^|[^a-z0-9])cvt([^a-z0-9]|$)/i.test(vehicleTransmission);
}

/** Require exact known vehicle dimensions; never broaden a document's scope. */
export function matchesKnowledgeChunk(chunk: IngestedKnowledgeChunk, vehicle: ApplicableKnowledgeContext): boolean {
  const metadata = chunk.metadata;
  if (!vehicle.make || !vehicle.model || !vehicle.generation || !vehicle.market || !vehicle.year || !vehicle.engine || !vehicle.transmission) return false;
  if (normalize(metadata.brand) !== normalize(vehicle.make) || normalize(metadata.model) !== normalize(vehicle.model)) return false;
  if (!metadata.generation || !matchesGeneration(metadata.generation, vehicle.generation)) return false;
  if (!metadata.market || normalize(metadata.market) !== normalize(vehicle.market)) return false;
  if (metadata.yearStart == null || metadata.yearEnd == null || vehicle.year < metadata.yearStart || vehicle.year > metadata.yearEnd) return false;
  if (!metadata.engine || !matchesEngine(chunk, vehicle.engine)) return false;
  if (!metadata.transmission || !matchesTransmission(metadata.transmission, vehicle.transmission)) return false;
  return true;
}

export function searchApplicableKnowledge(vehicle: ApplicableKnowledgeContext, query = "", chunks: IngestedKnowledgeChunk[] = ingestedKnowledgeChunks) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return chunks
    .filter((chunk) => matchesKnowledgeChunk(chunk, vehicle))
    .map((chunk) => ({ chunk, score: tokens.reduce((score, token) => score + (chunk.text.toLowerCase().includes(token) ? 1 : 0), 0) }))
    .filter(({ score }) => !tokens.length || score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ chunk, score }) => {
      const sourceInfo = publicKnowledgeSources.find((item) => item.id === chunk.metadata.sourceId);
      return {
        id: chunk.id, title: chunk.metadata.heading || chunk.metadata.category, text: chunk.text, category: chunk.metadata.category, risk: "routine" as const,
        confidence: "high" as const, sourceIds: [chunk.metadata.sourceId], sources: sourceInfo ? [sourceInfo] : [],
        applicability: chunk.metadata.generation + ", " + chunk.metadata.yearStart + "–" + chunk.metadata.yearEnd + "; совпали рынок, двигатель и КПП.",
        citation: { ...chunk.citation, documentName: chunk.citation.documentName || chunk.metadata.source, sourceUrl: chunk.citation.sourceUrl || sourceInfo?.url },
        evidenceType: "vehicle_document_excerpt" as const, score,
      };
    });
}

export function searchKnowledge(query: string, filters: Partial<KnowledgeChunk["metadata"]> = {}, chunks: IngestedKnowledgeChunk[] = ingestedKnowledgeChunks) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const importedChunks = chunks.filter((chunk) => matchesKnowledgeChunk(chunk, {
    make: filters.brand || undefined,
    model: filters.model || undefined,
    generation: filters.generation || undefined,
    market: filters.market || undefined,
    year: typeof filters.yearStart === "number" ? filters.yearStart : typeof filters.yearEnd === "number" ? filters.yearEnd : undefined,
    engine: filters.engine || undefined,
    transmission: filters.transmission || undefined,
  }));
  const importedIds = new Set(importedChunks.map((chunk) => chunk.id));
  return [...knowledgeChunks, ...importedChunks]
    .filter((chunk) => Object.entries(filters).every(([key, value]) => {
      // Imported excerpts have already passed the exact configuration matcher
      // above; do not reject them because the UI stores decorated engine or
      // transmission labels such as "2.0L MR20DD (144 л.с.)" or "Вариатор CVT".
      if (importedIds.has(chunk.id) && ["engine", "engineCode", "transmission", "generation"].includes(key)) return true;
      if (value == null) return true;
      const actual = chunk.metadata[key as keyof KnowledgeChunk["metadata"]];
      // Global safety/provenance guidance applies to every vehicle context.
      if (actual == null) return true;
      if (key === "yearStart" && typeof actual === "number" && typeof value === "number") return actual <= value;
      if (key === "yearEnd" && typeof actual === "number" && typeof value === "number") return actual >= value;
      return actual === value;
    }))
    .map((chunk) => ({ chunk, score: tokens.reduce((score, token) => score + (chunk.text.toLowerCase().includes(token) ? 1 : 0), 0) }))
    .filter(({ score }) => score > 0 || tokens.length === 0)
    .sort((a, b) => b.score - a.score)
    .map(({ chunk, score }) => ({ ...chunk, score }));
}
