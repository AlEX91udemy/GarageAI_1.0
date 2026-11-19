import type { Vehicle } from "../types";
import type { VehicleRecommendation } from "./types";
import { publicKnowledgeSources, recommendationRules } from "./publicSources";
import { ingestedKnowledgeChunks, searchApplicableKnowledge } from "./knowledge";
import type { IngestedKnowledgeChunk } from "./types";
import { getSeriesGuidance } from "./seriesGuidance";

const normalize = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const matchesKeyword = (token: string, keyword: string) => {
  const normalizedToken = normalize(token);
  const normalizedKeyword = normalize(keyword);
  if (!normalizedToken || !normalizedKeyword) return false;
  if (normalizedKeyword.length <= 2 || normalizedToken.length <= 2) return normalizedToken === normalizedKeyword;
  return normalizedKeyword.includes(normalizedToken) || normalizedToken.includes(normalizedKeyword);
};

export function getVehicleRecommendations(vehicle: Partial<Vehicle>, query = "", chunks: IngestedKnowledgeChunk[] = ingestedKnowledgeChunks): VehicleRecommendation[] {
  const make = normalize(vehicle.make);
  const makeAliases = make === "автоваз" || make === "ваз" ? [make, "лада", "lada"] : make === "лада" ? [make, "автоваз", "ваз"] : [make];
  const fuel = normalize(vehicle.fuelType);
  const mileage = typeof vehicle.currentMileage === "number" && Number.isFinite(vehicle.currentMileage) ? vehicle.currentMileage : null;
  const queryTokens = normalize(query).split(/\s+/).filter(Boolean);
  const documentRecommendations = searchApplicableKnowledge({
    make: vehicle.make, model: vehicle.model, generation: vehicle.generation, market: vehicle.market,
    year: vehicle.year, engine: vehicle.engine, transmission: vehicle.transmission,
  }, query, chunks);
  const genericRecommendations = recommendationRules
    .filter((rule) => {
      const { makes, fuelTypes, minMileageKm, maxMileageKm } = rule.appliesTo;
      if (makes?.length && !makes.some((item) => makeAliases.includes(normalize(item)))) return false;
      if (fuelTypes?.length && !fuelTypes.some((item) => fuel.includes(normalize(item)))) return false;
      if (minMileageKm !== undefined && (mileage === null || mileage < minMileageKm)) return false;
      if (maxMileageKm !== undefined && (mileage === null || mileage > maxMileageKm)) return false;
      if (!queryTokens.length) return true;
      return queryTokens.some((token) => rule.keywords.some((keyword) => matchesKeyword(token, keyword)));
    })
    .map((rule) => {
      const sources = rule.sourceIds.map((id) => publicKnowledgeSources.find((source) => source.id === id)).filter((source): source is (typeof publicKnowledgeSources)[number] => Boolean(source));
      // A registry URL is provenance, not evidence that this rule was checked
      // against the vehicle's exact market, year, engine, and transmission.
      const confidence: VehicleRecommendation["confidence"] = rule.risk === "safety" ? "medium" : "low";
      return { id: rule.id, title: rule.title, text: rule.text, category: rule.category, risk: rule.risk, confidence, sourceIds: rule.sourceIds, sources, applicability: mileage === null ? "Общая подсказка; пробег не указан. Сверьте применимость с руководством вашей комплектации." : "Пробег автомобиля: " + mileage.toLocaleString("ru-RU") + " км. Подтвердите применимость по году, двигателю, коробке и рынку.", evidenceType: "general_guidance" as const };
    });
  const seriesRecommendations = getSeriesGuidance(vehicle, query);
  const vehicleSpecificRuleIds = new Set(["rule-high-mileage-inspection", "rule-lada-manual", "rule-uaz-manual", "rule-gaz-service", "rule-moskvich-manual", "rule-domestic-high-mileage"]);
  const querySpecific = (item: VehicleRecommendation) => !queryTokens.length || item.evidenceType !== "general_guidance" ||
    queryTokens.some((token) => {
      const rule = recommendationRules.find((candidate) => candidate.id === item.id);
      return rule?.keywords.some((keyword) => matchesKeyword(token, keyword));
    });
  const actionableGeneric = genericRecommendations.filter((item) => {
    if (!queryTokens.length) return vehicleSpecificRuleIds.has(item.id);
    return querySpecific(item);
  });
  // Keep exact evidence and vehicle-specific advice ahead of global reminders;
  // the dashboard displays only the first three items.
  return [
    ...documentRecommendations,
    ...seriesRecommendations.filter((item) => item.knowledgeLevel === "model"),
    ...actionableGeneric,
    ...seriesRecommendations.filter((item) => item.knowledgeLevel === "make"),
    ...genericRecommendations.filter((item) => item.risk === "safety" && !actionableGeneric.some((entry) => entry.id === item.id) && querySpecific(item)),
  ];
}
