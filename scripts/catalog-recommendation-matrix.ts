import fs from "node:fs";
import { brands, catalogSources, engines, generations, models, modifications, modificationEvidence, transmissions } from "../src/catalog/database";
import { loadReviewedKnowledgeChunks } from "../src/catalog/ingestion";
import { getVehicleRecommendations } from "../src/catalog/recommendations";
import { publicKnowledgeSources } from "../src/catalog/publicSources";
import type { IngestedKnowledgeChunk } from "../src/catalog/types";
import { verifyModification } from "../src/catalog/verification";

const sourceById = new Map(publicKnowledgeSources.map((source) => [source.id, source]));
const modelById = new Map(models.map((model) => [model.id, model]));
const brandById = new Map(brands.map((brand) => [brand.id, brand]));
const generationById = new Map(generations.map((generation) => [generation.id, generation]));
const engineById = new Map(engines.map((engine) => [engine.id, engine]));
const transmissionById = new Map(transmissions.map((transmission) => [transmission.id, transmission]));
const reviewedChunks: IngestedKnowledgeChunk[] = [];
const corpus = JSON.parse(fs.readFileSync("data/knowledge_chunks.json", "utf8")) as unknown;
const corpusStatus = loadReviewedKnowledgeChunks(corpus, reviewedChunks, [...catalogSources, ...publicKnowledgeSources]);
const queries = ["", "тормоза", "масла", "перегрев", "ошибка"] as const;
const evidenceCounts: Record<string, number> = {};
const errors: string[] = [];
let recommendationChecks = 0;
let marketYearChecks = 0;
let referencedSources = 0;
let configurationProfiles = 0;

function checkRecommendations(label: string, vehicle: Parameters<typeof getVehicleRecommendations>[0]): void {
  for (const query of queries) {
    const recommendations = getVehicleRecommendations(vehicle, query, reviewedChunks);
    recommendationChecks += 1;
    const ids = new Set<string>();
    for (const item of recommendations) {
      if (ids.has(item.id)) errors.push(label + "/" + query + ": duplicate recommendation " + item.id);
      ids.add(item.id);
      const evidenceType = item.evidenceType || "missing_evidence_type";
      evidenceCounts[evidenceType] = (evidenceCounts[evidenceType] || 0) + 1;
      if (!["high", "medium", "low"].includes(item.confidence)) errors.push(label + ": invalid confidence on " + item.id);
      if (item.sourceIds.length !== item.sources.length) errors.push(label + ": source resolution mismatch on " + item.id);
      for (const sourceId of item.sourceIds) {
        referencedSources += 1;
        const source = sourceById.get(sourceId);
        if (!source) { errors.push(label + ": unknown public source " + sourceId + " on " + item.id); continue; }
        if (!source.url.startsWith("https://")) errors.push(label + ": non-HTTPS source " + sourceId);
        if (!item.sources.some((resolved) => resolved.id === sourceId)) errors.push(label + ": source " + sourceId + " was not resolved on " + item.id);
      }
      if (item.evidenceType === "vehicle_document_excerpt") {
        if (item.confidence !== "high" || !item.citation) errors.push(label + ": document excerpt lacks high confidence or citation");
        if (!item.citation?.locator || !/^[a-f0-9]{64}$/i.test(item.citation.documentHash)) errors.push(label + ": invalid document citation on " + item.id);
      }
    }
  }
}

for (const model of models) {
  const brand = brandById.get(model.brandId);
  if (!brand) { errors.push(model.id + ": model has no brand"); continue; }
  checkRecommendations("model:" + brand.name + "/" + model.name, { make: brand.name, model: model.name });
}

for (const modification of modifications) {
  configurationProfiles += 1;
  const generation = generationById.get(modification.generationId);
  const model = generation && modelById.get(generation.modelId);
  const brand = model && brandById.get(model.brandId);
  if (!generation || !model || !brand) { errors.push(modification.id + ": broken catalog references"); continue; }
  const engine = modification.engineId ? engineById.get(modification.engineId) : undefined;
  const transmission = modification.transmissionId ? transmissionById.get(modification.transmissionId) : undefined;
  const audit = verifyModification(modification, modificationEvidence, catalogSources);
  if (audit.status === "verified" && audit.missingEvidence.length > 0) errors.push(modification.id + ": verified with missing evidence");
  checkRecommendations("configuration:" + modification.id, {
    make: brand.name, model: model.name, generation: generation.name,
    year: modification.yearStart ?? generation.productionStart ?? undefined,
    engine: engine?.name || undefined,
    transmission: transmission ? (transmission.type + " " + (transmission.model || "")).trim() : undefined,
    fuelType: modification.fuelType || undefined, currentMileage: 0,
  });
  const unscoped = getVehicleRecommendations({
    make: brand.name, model: model.name, generation: generation.name,
    year: modification.yearStart ?? generation.productionStart ?? undefined,
    engine: engine?.name || undefined,
    transmission: transmission ? (transmission.type + " " + (transmission.model || "")).trim() : undefined,
  }, "масла", reviewedChunks);
  if (unscoped.some((item) => item.evidenceType === "vehicle_document_excerpt")) errors.push(modification.id + ": document evidence returned without a confirmed market");

  const candidateYears = new Set<number>();
  const firstYear = modification.yearStart ?? generation.productionStart;
  const lastYear = modification.yearEnd ?? generation.productionEnd ?? 2026;
  if (firstYear !== null && firstYear !== undefined && lastYear >= firstYear) {
    for (let year = firstYear; year <= lastYear; year += 1) candidateYears.add(year);
  } else {
    candidateYears.add(2026);
  }
  const markets = [undefined, "TH", "RU", "US", "EU"] as const;
  for (const year of candidateYears) {
    for (const market of markets) {
      const profile = {
        make: brand.name, model: model.name, generation: generation.name, market, year,
        engine: engine?.name || undefined,
        transmission: transmission ? (transmission.type + " " + (transmission.model || "")).trim() : undefined,
      };
      const excerpts = getVehicleRecommendations(profile, "", reviewedChunks)
        .filter((item) => item.evidenceType === "vehicle_document_excerpt");
      marketYearChecks += 1;
      const shouldMatchNissanManual = brand.name === "Nissan"
        && model.name === "X-Trail"
        && /^T32\b/i.test(generation.name)
        && market === "TH"
        && year === 2014
        && Boolean(engine?.name.includes("MR20DD"))
        && transmission?.type === "CVT";
      if (shouldMatchNissanManual && excerpts.length !== 2) {
        errors.push(modification.id + ": exact Nissan positive case expected 2 excerpts, got " + excerpts.length + " for " + market + "/" + year);
      } else if (!shouldMatchNissanManual && excerpts.length > 0) {
        errors.push(modification.id + ": unexpected document evidence for " + (market || "unknown-market") + "/" + year);
      }
    }
  }
}

const exactNissan = getVehicleRecommendations({
  make: "Nissan", model: "X-Trail", generation: "T32 (2013–2017)", market: "TH", year: 2014,
  engine: "2.0L MR20DD (144 л.с.)", transmission: "Вариатор CVT",
}, "", reviewedChunks).filter((item) => item.evidenceType === "vehicle_document_excerpt");
if (corpusStatus.loaded !== 2 || corpusStatus.rejected !== 0) errors.push("Reviewed corpus status unexpected: " + corpusStatus.loaded + " loaded, " + corpusStatus.rejected + " rejected");
if (exactNissan.length !== 2) errors.push("Exact Nissan positive control expected 2 excerpts, got " + exactNissan.length);

const report = {
  status: errors.length ? "failed" : "passed_with_catalog_evidence_gaps",
  modelsTested: models.length, configurationsTested: configurationProfiles, recommendationChecks, marketYearChecks,
  reviewedManualExcerptsLoaded: corpusStatus.loaded, exactConfigurationPositiveControl: exactNissan.length,
  referencedSources, recommendationEvidenceTypes: evidenceCounts,
  catalogEvidence: {
    verifiedConfigurations: modifications.filter((item) => verifyModification(item, modificationEvidence, catalogSources).status === "verified").length,
    configurationsWithoutFullEvidence: modifications.filter((item) => verifyModification(item, modificationEvidence, catalogSources).missingEvidence.length > 0).length,
  },
  errors,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
