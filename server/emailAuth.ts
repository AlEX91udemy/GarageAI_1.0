import crypto from "node:crypto";

export const EMAIL_LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
export const EMAIL_LOGIN_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
export const EMAIL_LOGIN_CODE_MAX_ATTEMPTS = 5;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function generateEmailLoginCode(): string {
  return crypto.randomInt(0, 100_000_000).toString().padStart(8, "0");
}

export function hashEmailLoginCode(email: string, code: string, pepper: string): string {
  if (!pepper || pepper.length < 32) {
    throw new Error("EMAIL_CODE_PEPPER must be configured with at least 32 characters");
  }
  return crypto.createHmac("sha256", pepper).update(`${normalizeEmail(email)}:${code}`).digest("hex");
}

export async function sendEmailLoginCode(email: string, code: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured: set RESEND_API_KEY and EMAIL_FROM");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [normalizeEmail(email)],
      subject: "Код входа в GarageAI",
      text: `Ваш код входа в GarageAI: ${code}\n\nКод действует 10 минут. Если вы не запрашивали вход, проигнорируйте это письмо.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    // Never include provider response bodies; they may contain recipient details.
    throw new Error(`Email provider request failed with status ${response.status}`);
  }
}
