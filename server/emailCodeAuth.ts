import { createHmac, randomInt } from "node:crypto";

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) ? email : null;
}

export function generateEmailCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashEmailCode(challengeId: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`${challengeId}:${code}`).digest("hex");
}
