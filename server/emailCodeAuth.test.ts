import { describe, expect, it } from "vitest";
import { generateEmailCode, hashEmailCode, normalizeEmail } from "./emailCodeAuth";

describe("email authentication helpers", () => {
  it("normalizes email addresses and rejects malformed values", () => {
    expect(normalizeEmail("  Alex.Example+garage@Example.com ")).toBe("alex.example+garage@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("user @example.com")).toBeNull();
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail(123)).toBeNull();
  });

  it("generates six-digit codes including leading zeroes", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(generateEmailCode()).toMatch(/^\d{6}$/);
    }
  });

  it("hashes a challenge code deterministically and binds it to the challenge id", () => {
    const secret = "test-secret-that-is-long-enough-for-unit-tests";
    const hash = hashEmailCode("challenge-1", "001234", secret);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashEmailCode("challenge-1", "001234", secret)).toBe(hash);
    expect(hashEmailCode("challenge-2", "001234", secret)).not.toBe(hash);
    expect(hashEmailCode("challenge-1", "001235", secret)).not.toBe(hash);
  });
});
