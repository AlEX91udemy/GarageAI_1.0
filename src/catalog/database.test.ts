import { describe, expect, it } from "vitest";
import { brands, models, generations, modifications, engines, transmissions, bodyTypes, catalogStats, catalogSearch, validateModification } from "./database";

describe("normalized vehicle catalog", () => {
  it("has unique identifiers and valid foreign keys", () => {
    for (const collection of [brands, models, generations, modifications, engines, transmissions, bodyTypes]) expect(new Set(collection.map((item) => item.id)).size).toBe(collection.length);
    const brandIds = new Set(brands.map((item) => item.id)); const modelIds = new Set(models.map((item) => item.id)); const generationIds = new Set(generations.map((item) => item.id)); const engineIds = new Set(engines.map((item) => item.id)); const transmissionIds = new Set(transmissions.map((item) => item.id)); const bodyIds = new Set(bodyTypes.map((item) => item.id));
    models.forEach((item) => expect(brandIds.has(item.brandId)).toBe(true)); generations.forEach((item) => expect(modelIds.has(item.modelId)).toBe(true)); modifications.forEach((item) => { expect(generationIds.has(item.generationId)).toBe(true); if (item.engineId) expect(engineIds.has(item.engineId)).toBe(true); if (item.transmissionId) expect(transmissionIds.has(item.transmissionId)).toBe(true); if (item.bodyTypeId) expect(bodyIds.has(item.bodyTypeId)).toBe(true); });
  });
  it("does not create a Cartesian product", () => expect(modifications.length).toBe(generations.length));
  it("keeps every generated configuration explicitly provisional until pair-level evidence exists", () => { expect(modifications.every((item) => item.status === "provisional" || item.status === "invalid")).toBe(true); expect(modifications.every((item) => item.audit.problems.length > 0)).toBe(true); });
  it("checks the BMW diesel fuel source correctly", () => { const engine = engines.find((item) => item.engineCode === "B47D20"); expect(engine?.fuelType).toBe("Дизель"); });
  it("detects a fuel conflict instead of accepting it", () => {
    const dieselEngine = engines.find((item) => item.engineCode === "B47D20");
    const candidate = modifications.find((item) => item.engineId === dieselEngine?.id)!;
    const audit = validateModification({ ...candidate, fuelType: "Бензин" });
    expect(audit.checks.fuel).toBe("fail");
    expect(audit.problems.some((problem) => problem.includes("Fuel conflict"))).toBe(true);
  });
  it("retains a possible generation/year conflict for review", () => {
    const candidate = modifications.find((item) => item.audit.checks.year === "fail");
    expect(candidate).toBeDefined();
    expect(candidate?.status).toBe("provisional");
  });
  it("exposes stable catalog statistics and search", () => { expect(catalogStats.brands).toBe(brands.length); expect(catalogStats.models).toBe(models.length); expect(catalogStats.generations).toBe(generations.length); expect(catalogSearch("Camry").some((item) => item.name === "Camry")).toBe(true); expect(catalogSearch("неизвестный автомобиль")).toEqual([]); });
});
