import type { Vehicle } from "../types";
import type { VehicleRecommendation } from "./types";
import { publicKnowledgeSources, recommendationRules } from "./publicSources";

const normalize = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";

export function getVehicleRecommendations(vehicle: Partial<Vehicle>, query = ""): VehicleRecommendation[] {
  const make = normalize(vehicle.make);
  const makeAliases = make === "автоваз" || make === "ваз" ? [make, "лада", "lada"] : make === "лада" ? [make, "автоваз", "ваз"] : [make];
  const fuel = normalize(vehicle.fuelType);
  const mileage = typeof vehicle.currentMileage === "number" && Number.isFinite(vehicle.currentMileage) ? vehicle.currentMileage : null;
  const queryTokens = normalize(query).split(/\s+/).filter(Boolean);
  return recommendationRules
    .filter((rule) => {
      const { makes, fuelTypes, minMileageKm, maxMileageKm } = rule.appliesTo;
      if (makes?.length && !makes.some((item) => makeAliases.includes(normalize(item)))) return false;
      if (fuelTypes?.length && !fuelTypes.some((item) => fuel.includes(normalize(item)))) return false;
      if (minMileageKm !== undefined && (mileage === null || mileage < minMileageKm)) return false;
      if (maxMileageKm !== undefined && (mileage === null || mileage > maxMileageKm)) return false;
      if (!queryTokens.length) return true;
      return queryTokens.some((token) => rule.keywords.some((keyword) => keyword.includes(token) || token.includes(keyword)));
    })
    .map((rule) => {
      const sources = rule.sourceIds.map((id) => publicKnowledgeSources.find((source) => source.id === id)).filter((source): source is (typeof publicKnowledgeSources)[number] => Boolean(source));
      const manufacturerMatch = sources.some((source) => source.scope === "manufacturer" && source.verificationStatus !== "network_unverified" && make && normalize(source.publisher) === make);
      return { id: rule.id, title: rule.title, text: rule.text, category: rule.category, risk: rule.risk, confidence: manufacturerMatch ? "high" : rule.risk === "safety" ? "medium" : "low", sourceIds: rule.sourceIds, sources, applicability: mileage === null ? "Пробег не указан; подтвердите применимость в руководстве." : "Пробег автомобиля: " + mileage.toLocaleString("ru-RU") + " км." };
    });
}
