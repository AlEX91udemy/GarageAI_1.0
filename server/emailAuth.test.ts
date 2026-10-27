import { describe, expect, it } from "vitest";
import {
  generateEmailLoginCode,
  hashEmailLoginCode,
  isValidEmail,
  normalizeEmail,
} from "./emailAuth";

describe("email authentication helpers", () => {
  it("normalizes and validates email addresses", () => {
    expect(normalizeEmail("  USER@GMAIL.COM ")).toBe("user@gmail.com");
    expect(isValidEmail("user@gmail.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("user @gmail.com")).toBe(false);
  });

  it("generates an eight-digit code", () => {
    expect(generateEmailLoginCode()).toMatch(/^\d{8}$/);
  });

  it("binds the code hash to both email and secret pepper", () => {
    const first = hashEmailLoginCode("user@gmail.com", "12345678", "a".repeat(32));
    expect(first).toHaveLength(64);
    expect(hashEmailLoginCode("USER@gmail.com", "12345678", "a".repeat(32))).toBe(first);
    expect(hashEmailLoginCode("other@gmail.com", "12345678", "a".repeat(32))).not.toBe(first);
    expect(hashEmailLoginCode("user@gmail.com", "12345678", "b".repeat(32))).not.toBe(first);
  });

  it("rejects weak code peppers", () => {
    expect(() => hashEmailLoginCode("user@gmail.com", "12345678", "short")).toThrow("EMAIL_CODE_PEPPER");
  });
});
