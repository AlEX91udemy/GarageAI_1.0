import { CAR_CATALOG, CarBodyType, MAKE_ALIASES, RUSSIA_TOP_100_MODELS } from "../carCatalog";
import type { Brand, BodyType, Drivetrain, Engine, FuelType, Generation, Model, Modification, ModificationAudit, ModificationEvidence, Transmission, CatalogSource } from "./types";
import { pilotEvidence } from "./pilotEvidence";

const retrievedAt = "2026-09-14";
export const catalogSources: CatalogSource[] = [
  {
    id: "source-legacy-catalog",
    source: "GarageHub legacy catalog (existing application data)",
    sourceUrl: null,
    sourceType: "legacy_catalog",
    documentName: null,
    documentVersion: null,
    publicationYear: null,
    retrievedAt,
    confidence: "low",
  },
  {
    id: "source-autostat-ru",
    source: "Аналитическое агентство «АВТОСТАТ» / «Автостат Инфо» (статистика авторынка и автопарка РФ)",
    sourceUrl: "https://www.autostat.ru",
    sourceType: "technical_database",
    documentName: "Отчёты по рынку новых легковых авто, авто с пробегом и структуре автопарка РФ (2024–2025)",
    documentVersion: "2024–2025",
    publicationYear: 2025,
    retrievedAt,
    confidence: "high",
  },
];

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9а-я]+/gi, "-").replace(/^-|-$/g, "");
const splitRange = (label: string, fallback: [number, number | null]): [number | null, number | null] => {
  const years = label.match(/(\d{4})\s*[–-]\s*(\d{4}|н\.в\.)/i);
  return years ? [Number(years[1]), years[2].startsWith("н") ? null : Number(years[2])] : fallback;
};

export const bodyTypes: BodyType[] = [
  ["sedan", "Седан", "Sedan"], ["hatchback", "Хэтчбек", "Hatchback"], ["liftback", "Лифтбек", "Liftback"],
  ["wagon", "Универсал", "Wagon"], ["suv", "Внедорожник", "SUV"], ["crossover", "Кроссовер", "Crossover"],
  ["coupe", "Купе", "Coupe"], ["convertible", "Кабриолет", "Convertible"], ["minivan", "Минивэн", "Minivan"],
  ["van", "Фургон", "Van"], ["pickup", "Пикап", "Pickup"], ["roadster", "Родстер", "Roadster"], ["minibus", "Микроавтобус", "Minibus"], ["crossover-coupe", "Кросс-купе", "Crossover-coupe"],
].map(([code, nameRu, nameEn]) => ({ id: `body-${code}`, code, nameRu, nameEn }));
export const drivetrains: Drivetrain[] = [
  { id: "drive-fwd", code: "FWD", nameRu: "Передний привод" },
  { id: "drive-rwd", code: "RWD", nameRu: "Задний привод" },
  { id: "drive-awd", code: "AWD", nameRu: "Полный привод" },
  { id: "drive-4wd", code: "4WD", nameRu: "Полный привод 4WD" },
  { id: "drive-unknown", code: "UNKNOWN", nameRu: "Не указан" },
];
export const fuelTypes: FuelType[] = [
  { id: "fuel-petrol", code: "petrol", nameRu: "Бензин" }, { id: "fuel-diesel", code: "diesel", nameRu: "Дизель" },
  { id: "fuel-hybrid", code: "hybrid", nameRu: "Гибрид" }, { id: "fuel-electric", code: "electric", nameRu: "Электро" },
];

const bodyId = (type: CarBodyType | string) => `body-${type === "suv" ? "suv" : type}`;
const driveId = (value: string | undefined) => {
  if (!value) return "drive-unknown";
  const v = value.toLowerCase();
  if (v.includes("передн")) return "drive-fwd";
  if (v.includes("задн")) return "drive-rwd";
  if (v.includes("4wd")) return "drive-4wd";
  if (v.includes("полный") || v.includes("awd") || v.includes("4x4") || v.includes("e-4orce")) return "drive-awd";
  return "drive-unknown";
};
const fuelValue = (value: string | undefined) => {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.includes("диз") || /\d(?:\.\d+)?\s*d(?:\b|\s)/i.test(v)) return "Дизель";
  if (v.includes("гибрид") || v.includes("hybrid") || v.includes("e-power")) return "Гибрид";
  if (v.includes("элект")) return "Электро";
  return "Бензин";
};

const engineMap = new Map<string, Engine>();
const transmissionMap = new Map<string, Transmission>();
const sourceId = "source-legacy-catalog";
const parseEngine = (raw: string, brand: string, yearRange: [number, number | null]): Engine => {
  const id = `engine-${slug(brand)}-${slug(raw)}`;
  const existing = engineMap.get(id);
  if (existing) return existing;
  const displacementMatch = raw.match(/(\d+(?:\.\d+)?)\s*L/i);
  const powerMatch = raw.match(/\((\d+)\s*л\.с\.?\)/i);
  const codeMatch = raw.match(/\b([A-Z][A-Z0-9-]{3,})\b/);
  const name = raw.replace(/\s*\([^)]*\)/, "").trim();
  const engine: Engine = { id, manufacturer: brand, engineCode: codeMatch?.[1] || null, name, displacement: displacementMatch ? Number(displacementMatch[1]) : null, cylinders: null, aspiration: /turbo|t-/i.test(raw) ? "turbo" : null, fuelType: fuelValue(raw), power: powerMatch ? Number(powerMatch[1]) : null, torque: null, productionYears: yearRange, sourceId };
  engineMap.set(id, engine); return engine;
};
const parseTransmission = (raw: string): Transmission => {
  const id = `trans-${slug(raw)}`;
  const existing = transmissionMap.get(id); if (existing) return existing;
  const low = raw.toLowerCase();
  const type = low.includes("вариатор") || low.includes("cvt") ? "CVT" : low.includes("робот") || low.includes("dct") || low.includes("ркпп") ? "DCT" : low.includes("мкпп") || low.includes("механ") ? "Механика" : low.includes("автомат") || low.includes("акпп") ? "Автомат" : "Другая";
  const gearsMatch = raw.match(/(\d+)[- ]?ст/);
  const modelMatch = raw.match(/\b(JF\d+E|DP\d+|\d+HP\d+|Xtronic|Multidrive\s*S|Direct\s*Shift[^,]*)/i);
  const transmission: Transmission = { id, type, gears: gearsMatch ? Number(gearsMatch[1]) : null, manufacturer: null, model: modelMatch?.[1] || null, notes: null, sourceId };
  transmissionMap.set(id, transmission); return transmission;
};

export const brands: Brand[] = CAR_CATALOG.map((make) => {
  const aliases = Object.entries(MAKE_ALIASES)
    .filter(([, target]) => target.toLowerCase() === make.name.toLowerCase())
    .map(([alias]) => alias);
  return { id: `brand-${slug(make.name)}`, name: make.name, nameRu: make.name, nameEn: make.name, country: make.country || null, logo: null, aliases, active: true };
});
// Body style is a property of a generation/modification, not of the model
// identity. A single model can therefore expose sedan, wagon, hatchback, etc.
export const models: Model[] = CAR_CATALOG.flatMap((make) => make.models.map((model) => ({ id: `model-${slug(make.name)}-${slug(model.name)}`, brandId: `brand-${slug(make.name)}`, name: model.name, nameRu: model.name, nameEn: model.name, aliases: [], category: null, active: true })));
export const generations: Generation[] = [];
export const modifications: Modification[] = [];

CAR_CATALOG.forEach((make) => make.models.forEach((model) => model.generations.forEach((gen, genIndex) => {
  const generationId = `generation-${slug(make.name)}-${slug(model.name)}-${genIndex + 1}`;
  const [productionStart, productionEnd] = splitRange(gen.yearLabel, gen.yearRange);
  generations.push({ id: generationId, modelId: `model-${slug(make.name)}-${slug(model.name)}`, name: gen.name, generationNumber: (gen.name.match(/^(?:[A-ZА-Я0-9-]+(?:\s*\/\s*[A-ZА-Я0-9-]+)?)/i)?.[0] || null), productionStart, productionEnd, facelift: /рестайлинг/i.test(gen.name), notes: null, sourceId });
  const engine = gen.engineSuggestions?.[0] ? parseEngine(gen.engineSuggestions[0], make.name, [productionStart, productionEnd]) : null;
  const transmission = gen.transmissionSuggestions?.[0] ? parseTransmission(gen.transmissionSuggestions[0]) : null;
  const body = gen.bodyTypes?.[0] || { type: gen.defaultBodyType, label: "" };
  const fuelType = fuelValue(gen.fuelTypeSuggestions?.[0]) || engine?.fuelType || null;
  const audit: ModificationAudit = { checkedAt: retrievedAt, checks: { references: "pass", year: "unknown", fuel: "unknown", engineTransmission: "unknown", body: "unknown", drivetrain: "unknown" }, problems: ["Legacy catalog has no pair-level compatibility evidence; candidate is provisional."], resolution: null };
  modifications.push({ id: `mod-${generationId}-1`, generationId, yearStart: productionStart, yearEnd: productionEnd, engineId: engine?.id || null, transmissionId: transmission?.id || null, drivetrainId: driveId(gen.driveTypeSuggestions?.[0]), bodyTypeId: body ? bodyId(body.type) : null, power: engine?.power || null, torque: engine?.torque || null, fuelType, displacement: engine?.displacement || null, cylinders: engine?.cylinders || null, doors: null, seats: null, lengthMm: null, widthMm: null, heightMm: null, wheelbaseMm: null, groundClearanceMm: null, trunkVolumeL: null, fuelConsumptionL100Km: null, fuelTankVolumeL: null, oilCapacityL: null, oilType: null, coolant: null, brakeFluid: null, serviceIntervalKm: null, serviceIntervalMonths: null, notes: "Provisional candidate derived from unpaired legacy suggestions.", sourceId, status: "provisional", audit });
}))); 

export const engines = Array.from(engineMap.values());
export const transmissions = Array.from(transmissionMap.values());
// Evidence is intentionally empty until authoritative documents are imported.
export const modificationEvidence: ModificationEvidence[] = pilotEvidence;
const mapById = <T extends { id: string }>(items: T[]) => new Map(items.map((item) => [item.id, item]));
export function validateModification(modification: Modification): ModificationAudit {
  const generation = mapById(generations).get(modification.generationId);
  const engine = modification.engineId ? mapById(engines).get(modification.engineId) : undefined;
  const transmission = modification.transmissionId ? mapById(transmissions).get(modification.transmissionId) : undefined;
  const body = modification.bodyTypeId ? mapById(bodyTypes).get(modification.bodyTypeId) : undefined;
  const problems: string[] = [];
  const references = generation && (!modification.engineId || engine) && (!modification.transmissionId || transmission) && (!modification.bodyTypeId || body) ? "pass" : "fail";
  if (references === "fail") problems.push("Missing referenced entity");
  const year = !generation || !engine ? "unknown" : (engine.productionYears[1] !== null && generation.productionStart !== null && engine.productionYears[1] < generation.productionStart) || (engine.productionYears[0] !== null && generation.productionEnd !== null && engine.productionYears[0] > generation.productionEnd) ? "fail" : "pass";
  if (year === "fail") problems.push("Engine production years do not overlap generation years");
  const normalizeFuel = (value: string | null | undefined) => value?.toLowerCase().includes("диз") ? "Дизель" : value?.toLowerCase().includes("гибрид") ? "Гибрид" : value ? "Бензин" : null;
  const fuel = !engine || !modification.fuelType || !engine.fuelType ? "unknown" : normalizeFuel(engine.fuelType) === normalizeFuel(modification.fuelType) ? "pass" : "fail";
  if (fuel === "fail") problems.push(`Fuel conflict: engine=${engine?.fuelType}, modification=${modification.fuelType}`);
  return { checkedAt: retrievedAt, checks: { references, year, fuel, engineTransmission: "unknown", body: "unknown", drivetrain: "unknown" }, problems: [...problems, "No authoritative pair-level engine/transmission, body or drivetrain compatibility source is present."], resolution: null };
}
const auditedModifications = modifications.map((modification) => { const audit = validateModification(modification); const hasExplicitFail = audit.checks.references === "fail" || audit.checks.fuel === "fail"; return { ...modification, audit, status: hasExplicitFail ? "invalid" as const : "provisional" as const }; });
modifications.splice(0, modifications.length, ...auditedModifications);
export const top100 = modifications.slice(0, 100);
export const top100RussiaModels = RUSSIA_TOP_100_MODELS;
export const catalogStats = { brands: brands.length, models: models.length, generations: generations.length, modifications: modifications.length, engines: engines.length, transmissions: transmissions.length, bodyTypes: bodyTypes.length, top100RussiaModels: RUSSIA_TOP_100_MODELS.length };

export function catalogSearch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return models
    .filter((model) => {
      const brand = brands.find((b) => b.id === model.brandId);
      const brandText = brand ? `${brand.name} ${brand.nameRu} ${brand.nameEn} ${brand.aliases.join(" ")}` : "";
      return `${brandText} ${model.name} ${model.nameRu} ${model.nameEn}`.toLowerCase().includes(q);
    })
    .map((model) => ({ ...model, brand: brands.find((brand) => brand.id === model.brandId) || null, generations: generations.filter((generation) => generation.modelId === model.id) }));
}



