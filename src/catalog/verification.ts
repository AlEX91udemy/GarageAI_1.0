import type { CatalogSource, Modification, ModificationEvidence } from "./types";

export const SOURCE_TIER_BY_TYPE: Record<CatalogSource["sourceType"], 1 | 2 | 3 | 4 | 5> = {
  official_manual: 1,
  official_spec: 1,
  dealer_material: 2,
  technical_database: 3,
  legacy_catalog: 4,
};

export interface VerificationResult {
  status: Modification["status"];
  evidenceCounts: Record<ModificationEvidence["claim"], number>;
  missingEvidence: ModificationEvidence["claim"][];
  conflictingEvidence: ModificationEvidence[];
  reason: string;
}

const claims: ModificationEvidence["claim"][] = ["engine", "transmission", "drivetrain", "body", "year", "fuel", "full_configuration"];

export function verifyModification(modification: Modification, evidence: ModificationEvidence[], sources: CatalogSource[]): VerificationResult {
  const related = evidence.filter((item) => item.modificationId === modification.id);
  const evidenceCounts = Object.fromEntries(claims.map((claim) => [claim, related.filter((item) => item.claim === claim && item.verificationStatus === "supports").length])) as Record<ModificationEvidence["claim"], number>;
  const conflictingEvidence = related.filter((item) => item.verificationStatus === "contradicts");
  const missingEvidence = claims.filter((claim) => evidenceCounts[claim] === 0);
  const hasAuthoritativeConflict = conflictingEvidence.some((item) => (sources.find((source) => source.id === item.sourceId) && (sources.find((source) => source.id === item.sourceId)!.confidence === "high" || item.tier <= 2)));
  if (hasAuthoritativeConflict) return { status: "invalid", evidenceCounts, missingEvidence, conflictingEvidence, reason: "Authoritative evidence contradicts this configuration." };
  const full = related.some((item) => item.claim === "full_configuration" && item.verificationStatus === "supports" && item.tier <= 2 && item.confidence === "high");
  if (full && missingEvidence.length === 0 && conflictingEvidence.length === 0) return { status: "verified", evidenceCounts, missingEvidence, conflictingEvidence, reason: "A high-confidence Tier 1/2 full-configuration claim covers all required dimensions." };
  const supportedDimensions = claims.slice(0, 6).filter((claim) => evidenceCounts[claim] > 0).length;
  if (supportedDimensions > 0) return { status: "partially_verified", evidenceCounts, missingEvidence, conflictingEvidence, reason: "Evidence supports only a subset of the configuration dimensions." };
  return { status: "provisional", evidenceCounts, missingEvidence, conflictingEvidence, reason: "No evidence is attached to this exact modification." };
}
