import { describe, expect, it } from "vitest";
import { modifications, catalogSources } from "./database";
import type { ModificationEvidence } from "./types";
import { verifyModification } from "./verification";
import { pilotEvidence } from "./pilotEvidence";

const base = modifications[0];
const evidence = (claim: ModificationEvidence["claim"], status: ModificationEvidence["verificationStatus"] = "supports", tier: ModificationEvidence["tier"] = 1, confidence: ModificationEvidence["confidence"] = "high"): ModificationEvidence => ({ id: `${claim}-${status}`, modificationId: base.id, sourceId: catalogSources[0].id, sourceUrl: null, claim, claimText: claim, scope: { generationId: base.generationId, engineId: base.engineId, transmissionId: base.transmissionId, drivetrainId: base.drivetrainId, bodyTypeId: base.bodyTypeId, yearStart: base.yearStart, yearEnd: base.yearEnd }, tier, confidence, verificationStatus: status, retrievedAt: "2026-09-14" });

describe("verification evidence rules", () => {
  it("keeps no pair-level evidence provisional", () => expect(verifyModification(base, [], catalogSources).status).toBe("provisional"));
  it("marks a subset of supported dimensions partially verified", () => expect(verifyModification(base, [evidence("engine"), evidence("year")], catalogSources).status).toBe("partially_verified"));
  it("requires a full configuration claim plus all dimensions for verified", () => {
    const all = (["engine", "transmission", "drivetrain", "body", "year", "fuel"] as const).map((claim) => evidence(claim));
    expect(verifyModification(base, [...all, evidence("full_configuration")], catalogSources).status).toBe("verified");
  });
  it("marks an authoritative contradiction invalid", () => expect(verifyModification(base, [evidence("full_configuration", "contradicts")], catalogSources).status).toBe("invalid"));
  it("does not promote conflicting support and contradiction to verified", () => {
    const all = (["engine", "transmission", "drivetrain", "body", "year", "fuel"] as const).map((claim) => evidence(claim));
    const result = verifyModification(base, [...all, evidence("full_configuration"), evidence("full_configuration", "contradicts")], catalogSources);
    expect(result.status).toBe("invalid");
  });
  it("does not treat engine-only or model identity as full configuration", () => expect(verifyModification(base, [evidence("engine")], catalogSources).status).toBe("partially_verified"));
  it("links every pilot evidence record to an existing modification", () => {
    expect(pilotEvidence.length).toBe(15);
    expect(pilotEvidence.every((item) => modifications.some((modification) => modification.id === item.modificationId))).toBe(true);
  });
  it("does not let unrelated evidence verify a modification", () => {
    const unrelated = pilotEvidence.filter((item) => item.modificationId !== base.id);
    expect(verifyModification(base, unrelated, catalogSources).status).toBe("provisional");
  });
});
