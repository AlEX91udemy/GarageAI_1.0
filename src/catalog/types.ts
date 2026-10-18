export type CatalogCategory = "maintenance" | "engine" | "transmission" | "brakes" | "suspension" | "electrical" | "cooling" | "fuel" | "fluids" | "tires" | "diagnostics" | "commonProblems" | "safety" | "specifications";

export interface CatalogSource {
  id: string;
  source: string;
  sourceUrl: string | null;
  sourceType: "official_manual" | "official_spec" | "dealer_material" | "technical_database" | "legacy_catalog";
  documentName: string | null;
  documentVersion: string | null;
  publicationYear: number | null;
  retrievedAt: string;
  confidence: "high" | "medium" | "low";
}

export type EvidenceTier = 1 | 2 | 3 | 4 | 5;
export type EvidenceConfidence = "high" | "medium" | "low";

export interface ModificationEvidence {
  id: string;
  modificationId: string;
  sourceId: string;
  sourceUrl: string | null;
  claim: "engine" | "transmission" | "drivetrain" | "body" | "year" | "fuel" | "full_configuration";
  claimText: string;
  scope: {
    generationId: string;
    engineId: string | null;
    transmissionId: string | null;
    drivetrainId: string | null;
    bodyTypeId: string | null;
    yearStart: number | null;
    yearEnd: number | null;
  };
  tier: EvidenceTier;
  confidence: EvidenceConfidence;
  verificationStatus: "supports" | "contradicts";
  retrievedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  nameRu: string;
  nameEn: string;
  country: string | null;
  logo: string | null;
  aliases: string[];
  active: boolean;
}

export interface Model {
  id: string;
  brandId: string;
  name: string;
  nameRu: string;
  nameEn: string;
  aliases: string[];
  category: string | null;
  active: boolean;
}

export interface Generation {
  id: string;
  modelId: string;
  name: string;
  generationNumber: string | null;
  productionStart: number | null;
  productionEnd: number | null;
  facelift: boolean;
  notes: string | null;
  sourceId: string;
}

export interface Engine {
  id: string;
  manufacturer: string | null;
  engineCode: string | null;
  name: string;
  displacement: number | null;
  cylinders: number | null;
  aspiration: string | null;
  fuelType: string | null;
  power: number | null;
  torque: number | null;
  productionYears: [number | null, number | null];
  sourceId: string;
}

export interface Transmission {
  id: string;
  type: string;
  gears: number | null;
  manufacturer: string | null;
  model: string | null;
  notes: string | null;
  sourceId: string;
}

export interface BodyType { id: string; code: string; nameRu: string; nameEn: string; }
export interface Drivetrain { id: string; code: string; nameRu: string; }
export interface FuelType { id: string; code: string; nameRu: string; }

export interface Modification {
  id: string;
  generationId: string;
  yearStart: number | null;
  yearEnd: number | null;
  engineId: string | null;
  transmissionId: string | null;
  drivetrainId: string | null;
  bodyTypeId: string | null;
  power: number | null;
  torque: number | null;
  fuelType: string | null;
  displacement: number | null;
  cylinders: number | null;
  doors: number | null;
  seats: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  wheelbaseMm: number | null;
  groundClearanceMm: number | null;
  trunkVolumeL: number | null;
  fuelConsumptionL100Km: number | null;
  fuelTankVolumeL: number | null;
  oilCapacityL: number | null;
  oilType: string | null;
  coolant: string | null;
  brakeFluid: string | null;
  serviceIntervalKm: number | null;
  serviceIntervalMonths: number | null;
  notes: string | null;
  sourceId: string;
  status: "verified" | "partially_verified" | "provisional" | "invalid" | "deprecated";
  audit: ModificationAudit;
}

export interface ModificationAudit {
  checkedAt: string;
  checks: {
    references: "pass" | "fail";
    year: "pass" | "fail" | "unknown";
    fuel: "pass" | "fail" | "unknown";
    engineTransmission: "pass" | "fail" | "unknown";
    body: "pass" | "fail" | "unknown";
    drivetrain: "pass" | "fail" | "unknown";
  };
  problems: string[];
  resolution: string | null;
}

export interface KnowledgeChunk {
  id: string;
  text: string;
  metadata: {
    brand: string | null;
    model: string | null;
    generation: string | null;
    yearStart: number | null;
    yearEnd: number | null;
    engine: string | null;
    engineCode: string | null;
    transmission: string | null;
    category: CatalogCategory;
    source: string;
    sourceType: CatalogSource["sourceType"];
    sourceId: string;
  };
}
