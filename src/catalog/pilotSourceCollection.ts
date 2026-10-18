export interface PilotSourceCollectionRecord {
  modificationId: string;
  collectionStatus: "not_collected" | "collected";
  attemptedAt: string;
  reason: string;
  externalEvidenceIds: string[];
}

// Phase 5 pilot scope. No external records are claimed when network access is unavailable.
export const pilotSourceCollection: PilotSourceCollectionRecord[] = [
  "mod-generation-nissan-x-trail-1-1",
  "mod-generation-toyota-camry-2-1",
  "mod-generation-bmw-3-series-2-1",
  "mod-generation-lada-vesta-1-1",
  "mod-generation-kia-rio-1-1",
  "mod-generation-haval-jolion-1-1",
  "mod-generation-mazda-cx-5-1-1",
  "mod-generation-toyota-rav4-1-1",
  "mod-generation-chery-tiggo-7-pro-max-1-1",
  "mod-generation-audi-q5-1-1",
].map((modificationId) => ({
  modificationId,
  collectionStatus: "not_collected",
  attemptedAt: "2026-09-14",
  reason: "External HTTPS access is unavailable in the execution environment; no source URL was verified.",
  externalEvidenceIds: [],
}));
