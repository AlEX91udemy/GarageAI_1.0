import type { CatalogSource, Modification, ModificationEvidence } from "./types";
import { SOURCE_TIER_BY_TYPE, verifyModification, type VerificationResult } from "./verification";

export const SOURCE_POLICY = {
  tiers: {
    1: { label: "Официальный производитель", allowed: ["official_manual", "official_spec"] },
    2: { label: "Официальная техническая документация", allowed: ["dealer_material"] },
    3: { label: "Авторитетная automotive database", allowed: ["technical_database"] },
    4: { label: "Legacy catalog", allowed: ["legacy_catalog"] },
    5: { label: "Вторичный источник", allowed: [] },
  },
  verified: { minimumTier: 2, confidence: "high", requires: ["engine", "transmission", "drivetrain", "body", "year", "fuel", "full_configuration"] },
} as const;

export const CLAIM_POLICY: Record<ModificationEvidence["claim"], { minimumTier: 1 | 2 | 3 | 4 | 5; pairLevel: boolean }> = {
  engine: { minimumTier: 3, pairLevel: false }, transmission: { minimumTier: 3, pairLevel: false }, drivetrain: { minimumTier: 3, pairLevel: false }, body: { minimumTier: 3, pairLevel: false }, year: { minimumTier: 3, pairLevel: false }, fuel: { minimumTier: 3, pairLevel: false }, full_configuration: { minimumTier: 2, pairLevel: true },
};

export interface EvidenceConflict { modificationId: string; claim: ModificationEvidence["claim"]; evidenceIds: string[]; severity: "high" | "medium" | "low"; resolutionStatus: "unresolved" | "resolved"; }
export interface ValidatedEvidence { accepted: ModificationEvidence[]; rejected: Array<{ evidence: ModificationEvidence; reason: string }>; conflicts: EvidenceConflict[]; }

export function validateEvidenceBatch(raw: unknown, modifications: Modification[], sources: CatalogSource[]): ValidatedEvidence {
  const accepted: ModificationEvidence[] = []; const rejected: ValidatedEvidence["rejected"] = [];
  const modificationIds = new Set(modifications.map((item) => item.id)); const sourceMap = new Map(sources.map((item) => [item.id, item]));
  if (!Array.isArray(raw)) return { accepted, rejected: [{ evidence: raw as ModificationEvidence, reason: "Evidence batch must be an array" }], conflicts: [] };
  for (const item of raw) {
    if (!item || typeof item !== "object") { rejected.push({ evidence: item as ModificationEvidence, reason: "Evidence must be an object" }); continue; }
    const evidence = item as ModificationEvidence; const source = sourceMap.get(evidence.sourceId);
    if (!evidence.id || !evidence.modificationId || !modificationIds.has(evidence.modificationId)) { rejected.push({ evidence, reason: "Unknown modification scope" }); continue; }
    if (!source || SOURCE_TIER_BY_TYPE[source.sourceType] !== evidence.tier) { rejected.push({ evidence, reason: "Source is missing or tier does not match source policy" }); continue; }
    if (!CLAIM_POLICY[evidence.claim] || !evidence.scope || evidence.scope.generationId !== modifications.find((modification) => modification.id === evidence.modificationId)?.generationId) { rejected.push({ evidence, reason: "Claim or generation scope is invalid" }); continue; }
    accepted.push(evidence);
  }
  const conflicts = accepted.filter((item, index, all) => all.some((other) => other !== item && other.modificationId === item.modificationId && other.claim === item.claim && other.verificationStatus !== item.verificationStatus)).map((item) => ({ modificationId: item.modificationId, claim: item.claim, evidenceIds: accepted.filter((other) => other.modificationId === item.modificationId && other.claim === item.claim).map((other) => other.id), severity: item.tier <= 2 ? "high" as const : "medium" as const, resolutionStatus: "unresolved" as const }));
  return { accepted, rejected, conflicts: conflicts.filter((item, index, all) => all.findIndex((candidate) => candidate.modificationId === item.modificationId && candidate.claim === item.claim) === index) };
}

export function verifyWithPolicy(modification: Modification, evidence: ModificationEvidence[], sources: CatalogSource[]): VerificationResult { return verifyModification(modification, evidence, sources); }
