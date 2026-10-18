import type { KnowledgeChunk } from "./types";
import { catalogSources } from "./database";

const source = catalogSources[0];
export const knowledgeChunks: KnowledgeChunk[] = [
  {
    id: "kb-safety-001",
    text: "При признаках отказа тормозов, проблемах с рулевым управлением, перегреве, утечке топлива или срабатывании подушек безопасности эксплуатацию следует прекратить и обратиться в сервис. Это правило безопасности, а не диагноз конкретной неисправности.",
    metadata: { brand: null, model: null, generation: null, yearStart: null, yearEnd: null, engine: null, engineCode: null, transmission: null, category: "safety", source: source.source, sourceType: source.sourceType, sourceId: source.id },
  },
  {
    id: "kb-provenance-001",
    text: "Каталожные параметры GarageHub, импортированные из legacy-каталога, требуют проверки по руководству производителя для конкретного рынка, года, двигателя и коробки передач. При конфликте источников приоритет имеет официальный документ.",
    metadata: { brand: null, model: null, generation: null, yearStart: null, yearEnd: null, engine: null, engineCode: null, transmission: null, category: "specifications", source: source.source, sourceType: source.sourceType, sourceId: source.id },
  },
];

export function searchKnowledge(query: string, filters: Partial<KnowledgeChunk["metadata"]> = {}) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return knowledgeChunks
    .filter((chunk) => Object.entries(filters).every(([key, value]) => {
      if (value == null) return true;
      const actual = chunk.metadata[key as keyof KnowledgeChunk["metadata"]];
      // Global safety/provenance guidance applies to every vehicle context.
      return actual == null || actual === value;
    }))
    .map((chunk) => ({ chunk, score: tokens.reduce((score, token) => score + (chunk.text.toLowerCase().includes(token) ? 1 : 0), 0) }))
    .filter(({ score }) => score > 0 || tokens.length === 0)
    .sort((a, b) => b.score - a.score)
    .map(({ chunk, score }) => ({ ...chunk, score }));
}
