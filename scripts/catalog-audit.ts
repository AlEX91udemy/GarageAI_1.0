import { catalogStats, modifications, modificationEvidence } from "../src/catalog/database";
import { verifyModification } from "../src/catalog/verification";
import { catalogSources } from "../src/catalog/database";
import { validateEvidenceBatch } from "../src/catalog/evidencePolicy";

const evidenceValidation = validateEvidenceBatch(modificationEvidence, modifications, catalogSources);
const verification = modifications.map((item) => verifyModification(item, evidenceValidation.accepted, catalogSources));
const counts = verification.reduce<Record<string, number>>((acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {});
const conflicts = verification.flatMap((item) => item.conflictingEvidence);
const missingSources = modifications.filter((item) => !item.sourceId);
const evidenceSummary = Object.fromEntries(["engine", "transmission", "drivetrain", "body", "year", "fuel", "full_configuration"].map((claim) => [claim, evidenceValidation.accepted.filter((item) => item.claim === claim).length]));
const evidenceByTier = Object.fromEntries([1, 2, 3, 4, 5].map((tier) => [tier, evidenceValidation.accepted.filter((item) => item.tier === tier).length]));
const authoritativeModifications = new Set(evidenceValidation.accepted.filter((item) => item.tier <= 2 && item.confidence === "high").map((item) => item.modificationId));
const legacyOnly = new Set(evidenceValidation.accepted.filter((item) => item.tier === 4).map((item) => item.modificationId));
const result = { total: modifications.length, ...counts, missingEvidence: verification.filter((item) => item.missingEvidence.length > 0).length, conflictingEvidence: conflicts.length + evidenceValidation.conflicts.length, rejectedEvidence: evidenceValidation.rejected.length, unknownCompatibility: verification.filter((item) => item.evidenceCounts.full_configuration === 0).length, evidence: evidenceSummary, evidenceByTier, authoritativeModifications: authoritativeModifications.size, legacyOnlyModifications: legacyOnly.size, potentiallyVerified: verification.filter((item) => item.missingEvidence.length === 0 && item.conflictingEvidence.length === 0).length, missingSources: missingSources.length, problems: verification.slice(0, 20).map((item, index) => ({ id: modifications[index].id, status: item.status, reason: item.reason })) };
console.log(JSON.stringify(result, null, 2));
