import { describe, expect, it } from "vitest";
import { catalogSources, modifications } from "./database";
import { SOURCE_POLICY, validateEvidenceBatch } from "./evidencePolicy";
import { pilotEvidence } from "./pilotEvidence";

describe("evidence source policy", () => {
  it("classifies legacy source as tier 4 and rejects mismatched tier", () => {
    expect(SOURCE_POLICY.tiers[4].allowed).toContain("legacy_catalog");
    const result = validateEvidenceBatch([{ ...pilotEvidence[0], tier: 1 }], modifications, catalogSources);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0].reason).toContain("tier");
  });
  it("accepts pilot evidence only with exact modification and generation scope", () => {
    const result = validateEvidenceBatch([pilotEvidence[0]], modifications, catalogSources);
    expect(result.accepted).toHaveLength(1);
    const unrelated = { ...pilotEvidence[0], modificationId: modifications[1].id };
    expect(validateEvidenceBatch([unrelated], modifications, catalogSources).accepted).toHaveLength(0);
  });
  it("detects opposing claims as unresolved conflict", () => {
    const pair = [pilotEvidence[0], { ...pilotEvidence[0], id: "pilot-conflict", verificationStatus: "contradicts" as const }];
    const result = validateEvidenceBatch(pair, modifications, catalogSources);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].resolutionStatus).toBe("unresolved");
  });
});
