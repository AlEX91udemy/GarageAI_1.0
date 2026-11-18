import { describe, expect, it } from "vitest";
import { getVehicleRecommendations } from "./recommendations";
import { searchApplicableKnowledge } from "./knowledge";
import type { IngestedKnowledgeChunk } from "./types";

const xtrailThailandT32Excerpt: IngestedKnowledgeChunk = {
  id: "test-xtrail-t32-th-oil",
  text: "Проверяйте уровень моторного масла по процедуре из раздела обслуживания.",
  metadata: {
    heading: "Проверка масла", brand: "Nissan", model: "X-Trail", generation: "T32-A", market: "TH",
    yearStart: 2014, yearEnd: 2017, engine: "MR20DD", engineCode: "MR20DD", transmission: "CVT",
    category: "maintenance", source: "Nissan X-Trail Thailand Owner Manual", sourceType: "official_manual", sourceId: "source-nissan-xtrail-thailand-t32",
  },
  citation: { locator: "раздел обслуживания", documentHash: "0".repeat(64), documentName: "Nissan X-Trail T32-A Owner Manual", sourceUrl: "https://en.nissan.co.th/content/dam/Nissan/th/owners/OwnerManual-170612/X-Trail%20Owner%20Manual%20EN.pdf" },
};

describe("vehicle recommendations", () => {
  it("returns safety guidance with citable provenance", () => {
    const result = getVehicleRecommendations({ make: "Nissan", model: "X-Trail" }, "тормоза");
    expect(result.some((item) => item.risk === "safety")).toBe(true);
    expect(result[0].sources[0].url.startsWith("https://")).toBe(true);
    expect(result[0].confidence).toBe("medium");
  });

  it("does not treat a manufacturer link as verified advice for an exact vehicle", () => {
    const result = getVehicleRecommendations({ make: "Nissan", model: "X-Trail", year: 2008, engine: "2.0 MR20DE", transmission: "CVT" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.confidence === "low" || item.confidence === "medium")).toBe(true);
    expect(result.every((item) => item.applicability.includes("руководством"))).toBe(true);
  });

  it("applies high-mileage checks only when mileage is known", () => {
    expect(getVehicleRecommendations({ currentMileage: 90000 }).some((item) => item.id === "rule-high-mileage-inspection")).toBe(false);
    expect(getVehicleRecommendations({ currentMileage: 150000 }).some((item) => item.id === "rule-high-mileage-inspection")).toBe(true);
  });

  it("supports keyword filtering", () => {
    const result = getVehicleRecommendations({}, "recall VIN");
    expect(result.map((item) => item.id)).toEqual(["rule-recall-check"]);
  });

  it("returns domestic manufacturer guidance for Lada and UAZ", () => {
    const lada = getVehicleRecommendations({ make: "Lada", model: "Vesta" });
    const uaz = getVehicleRecommendations({ make: "УАЗ", model: "Patriot" });
    expect(lada.some((item) => item.id === "rule-lada-manual")).toBe(true);
    expect(lada.find((item) => item.id === "rule-lada-manual")?.sources[0].id).toBe("source-avtovaz-manuals");
    expect(uaz.some((item) => item.id === "rule-uaz-manual")).toBe(true);
  });

  it("adds the domestic high-mileage inspection only after 100,000 km", () => {
    expect(getVehicleRecommendations({ make: "Lada", currentMileage: 99000 }).some((item) => item.id === "rule-domestic-high-mileage")).toBe(false);
    expect(getVehicleRecommendations({ make: "Lada", currentMileage: 100000 }).some((item) => item.id === "rule-domestic-high-mileage")).toBe(true);
  });

  it("only retrieves a cited excerpt when market, generation, year, engine and transmission match", () => {
    const exact = searchApplicableKnowledge({ make: "Nissan", model: "X-Trail", generation: "T32-A", market: "TH", year: 2015, engine: "MR20DD", transmission: "CVT" }, "масла", [xtrailThailandT32Excerpt]);
    expect(exact).toHaveLength(1);
    expect(exact[0].citation.documentHash).toBe("0".repeat(64));

    for (const vehicle of [
      { make: "Nissan", model: "X-Trail", generation: "T32-A", market: "RU", year: 2015, engine: "MR20DD", transmission: "CVT" },
      { make: "Nissan", model: "X-Trail", generation: "T31", market: "TH", year: 2015, engine: "MR20DD", transmission: "CVT" },
      { make: "Nissan", model: "X-Trail", generation: "T32-A", market: "TH", year: 2015, engine: "QR25DE", transmission: "CVT" },
      { make: "Nissan", model: "X-Trail", generation: "T32-A", year: 2015, engine: "MR20DD", transmission: "CVT" },
    ]) expect(searchApplicableKnowledge(vehicle, "масла", [xtrailThailandT32Excerpt])).toHaveLength(0);
  });

  it("does not use the downloaded T32 manual as evidence for the 2008 T31", () => {
    const result = getVehicleRecommendations({ make: "Nissan", model: "X-Trail", generation: "T31", market: "RU", year: 2008, engine: "2.0 MR20DE", transmission: "CVT" }, "масла", [xtrailThailandT32Excerpt]);
    expect(result.some((item) => item.evidenceType === "vehicle_document_excerpt")).toBe(false);
  });

  it("adds model-series guidance while keeping it low-confidence", () => {
    const result = getVehicleRecommendations({ make: "Toyota", model: "Camry" }, "охлаждение");
    const series = result.find((item) => item.evidenceType === "model_series_guidance");
    expect(series?.knowledgeLevel).toBe("model");
    expect(series?.confidence).toBe("low");
    expect(series?.applicability).toContain("поколения");
    expect(series?.sources[0].id).toBe("source-toyota-manuals");
  });

  it("adds make guidance when the model is outside the seeded series", () => {
    const result = getVehicleRecommendations({ make: "Haval", model: "Unknown" });
    const make = result.find((item) => item.evidenceType === "make_guidance");
    expect(make?.knowledgeLevel).toBe("make");
    expect(make?.sources[0].id).toBe("source-haval-manuals");
  });

  it("recognizes common Russian make aliases in the series layer", () => {
    const result = getVehicleRecommendations({ make: "Хендай", model: "Solaris" }, "масло");
    expect(result.some((item) => item.evidenceType === "model_series_guidance")).toBe(true);
  });
});
