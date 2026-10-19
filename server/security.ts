import crypto from "crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, nRaw, rRaw, pRaw, saltRaw, hashRaw] = stored.split("$");
    if (scheme !== "scrypt" || !saltRaw || !hashRaw) return false;
    const salt = Buffer.from(saltRaw, "base64");
    const expected = Buffer.from(hashRaw, "base64");
    const derived = crypto.scryptSync(password, salt, expected.length, {
      N: Number(nRaw) || SCRYPT_OPTIONS.N,
      r: Number(rRaw) || SCRYPT_OPTIONS.r,
      p: Number(pRaw) || SCRYPT_OPTIONS.p,
      maxmem: SCRYPT_OPTIONS.maxmem,
    });
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export interface SessionRecord {
  tokenHash: string;
  csrfSecret: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  revokedAt?: number;
}

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const SESSION_RENEW_THRESHOLD_MS = 60 * 60 * 1000;

export function createSession(userId: string, now = Date.now()): { record: SessionRecord; token: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  const csrfSecret = crypto.randomBytes(24).toString("base64url");
  return {
    token,
    record: {
      tokenHash: hashToken(token),
      csrfSecret,
      userId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    },
  };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyCsrf(session: SessionRecord, provided: unknown): boolean {
  if (typeof provided !== "string" || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(session.csrfSecret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
