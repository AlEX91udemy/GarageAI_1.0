import { describe, expect, it } from "vitest";
import { getVehicleRecommendations } from "./recommendations";

describe("vehicle recommendations", () => {
  it("returns safety guidance with citable provenance", () => {
    const result = getVehicleRecommendations({ make: "Nissan", model: "X-Trail" }, "тормоза");
    expect(result.some((item) => item.risk === "safety")).toBe(true);
    expect(result[0].sources[0].url.startsWith("https://")).toBe(true);
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
});
