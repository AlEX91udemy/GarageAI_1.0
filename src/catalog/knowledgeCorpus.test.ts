import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogSources } from "./database";
import { publicKnowledgeSources } from "./publicSources";
import { loadReviewedKnowledgeChunks } from "./ingestion";
import { getVehicleRecommendations } from "./recommendations";
import { searchKnowledge } from "./knowledge";
import type { IngestedKnowledgeChunk } from "./types";

describe("reviewed vehicle knowledge corpus", () => {
  it("loads only the reviewed Nissan T32-A configuration and produces cited advice", () => {
    const target: IngestedKnowledgeChunk[] = [];
    const raw = JSON.parse(readFileSync("data/knowledge_chunks.json", "utf8")) as unknown;
    const result = loadReviewedKnowledgeChunks(raw, target, [...catalogSources, ...publicKnowledgeSources]);
    expect(result).toEqual({ loaded: 2, rejected: 0 });
    const recommendations = getVehicleRecommendations({
      make: "Nissan", model: "X-Trail", generation: "T32 (2013–2017)", market: "TH", year: 2014, engine: "2.0L MR20DD (144 л.с.)", transmission: "Вариатор CVT",
    }, "масла", target);
    expect(recommendations.some((item) => item.evidenceType === "vehicle_document_excerpt" && item.confidence === "high")).toBe(true);
    expect(recommendations.find((item) => item.evidenceType === "vehicle_document_excerpt")?.citation?.locator).toContain("8-10");
    expect(searchKnowledge("масла", {
      brand: "Nissan", model: "X-Trail", generation: "T32 (2013–2017)", market: "TH", yearStart: 2014, yearEnd: 2014, engine: "2.0L MR20DD (144 л.с.)", transmission: "Вариатор CVT",
    }, target).some((item) => item.id === "kb-nissan-xtrail-t32-th-engine-oil-check")).toBe(true);
    expect(getVehicleRecommendations({
      make: "Nissan", model: "X-Trail", generation: "T32 (2013–2017)", market: "TH", year: 2014, engine: "MR20DD", transmission: "e-CVT",
    }, "масла", target).some((item) => item.evidenceType === "vehicle_document_excerpt")).toBe(false);
    expect(getVehicleRecommendations({
      make: "Nissan", model: "X-Trail", generation: "T32 (2013–2017)", market: "TH", year: 2015, engine: "MR20DD", transmission: "CVT",
    }, "масла", target).some((item) => item.evidenceType === "vehicle_document_excerpt")).toBe(false);
    expect(getVehicleRecommendations({
      make: "Nissan", model: "X-Trail", generation: "T31", market: "RU", year: 2008, engine: "MR20DE", transmission: "CVT",
    }, "масла", target).some((item) => item.evidenceType === "vehicle_document_excerpt")).toBe(false);
  });
});
