import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const COLLECTION_KEYS = [
  "vehicles",
  "reminders",
  "serviceRecords",
  "fuelRecords",
  "oemSchedules",
  "garageParts",
  "toFixTasks",
  "tuningStages",
] as const;

type LegacyUser = { id: string; username: string; passwordHash: string; createdAt: string };
type LegacySession = {
  tokenHash: string;
  csrfSecret: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  revokedAt?: number;
};
type LegacyBundle = {
  users: LegacyUser[];
  garages: Map<string, Record<string, unknown>>;
  sessions: LegacySession[];
  ownerlessGaragePresent: boolean;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stableJson(record[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeGarage(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of COLLECTION_KEYS) {
    const collection = value[key];
    if (collection !== undefined && !Array.isArray(collection)) throw new Error("Invalid garage collection: " + key);
    result[key] = Array.isArray(collection) ? collection : [];
  }
  result.lastUpdated = typeof value.lastUpdated === "string" ? value.lastUpdated : new Date(0).toISOString();
  return result;
}

async function loadBundle(sourceDir: string): Promise<LegacyBundle> {
  const usersPath = path.join(sourceDir, "users.json");
  const garagesPath = path.join(sourceDir, "garage_store.json");
  const sessionsPath = path.join(sourceDir, "sessions.json");
  const usersRaw = JSON.parse(await fs.readFile(usersPath, "utf8")) as unknown;
  const garagesRaw = JSON.parse(await fs.readFile(garagesPath, "utf8")) as unknown;
  let sessionsRaw: unknown = [];
  try {
    sessionsRaw = JSON.parse(await fs.readFile(sessionsPath, "utf8"));
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "ENOENT")) throw error;
  }

  if (!Array.isArray(usersRaw)) throw new Error("users.json must contain an array");
  if (!Array.isArray(sessionsRaw)) throw new Error("sessions.json must contain an array");
  const userIds = new Set<string>();
  const usernames = new Set<string>();
  const users: LegacyUser[] = usersRaw.map((raw) => {
    const item = readObject(raw);
    if (!item || typeof item.id !== "string" || !item.id.trim() ||
        typeof item.username !== "string" || !item.username.trim() ||
        typeof item.passwordHash !== "string" || !item.passwordHash.startsWith("scrypt$")) {
      throw new Error("users.json contains an invalid account record");
    }
    const id = item.id.trim();
    const username = item.username.trim();
    const normalized = username.toLowerCase();
    if (userIds.has(id) || usernames.has(normalized)) throw new Error("users.json contains duplicate account IDs or usernames");
    userIds.add(id);
    usernames.add(normalized);
    const createdAt = typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt))
      ? new Date(item.createdAt).toISOString()
      : new Date(0).toISOString();
    return { id, username, passwordHash: item.passwordHash, createdAt };
  });

  const garageRoot = readObject(garagesRaw);
  if (!garageRoot) throw new Error("garage_store.json must contain an object");
  const garageMap = readObject(garageRoot.garages);
  const garages = new Map<string, Record<string, unknown>>();
  if (garageMap) {
    for (const [userId, value] of Object.entries(garageMap)) {
      const item = readObject(value);
      if (!item) throw new Error("garage_store.json contains an invalid garage record");
      garages.set(userId, normalizeGarage(item));
    }
  }
  const ownerlessGaragePresent = !garageMap && Array.isArray(garageRoot.vehicles);

  const now = Date.now();
  const sessions: LegacySession[] = [];
  for (const raw of sessionsRaw) {
    const item = readObject(raw);
    if (!item) continue;
    if (typeof item.tokenHash !== "string" || !/^[a-f0-9]{64}$/i.test(item.tokenHash) ||
        typeof item.csrfSecret !== "string" || typeof item.userId !== "string" ||
        typeof item.createdAt !== "number" || typeof item.expiresAt !== "number") continue;
    if (item.expiresAt <= now || item.revokedAt) continue;
    sessions.push({
      tokenHash: item.tokenHash.toLowerCase(),
      csrfSecret: item.csrfSecret,
      userId: item.userId,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
    });
  }

  return { users, garages, sessions, ownerlessGaragePresent };
}

async function verifySchema(db: any) {
  const rows = await db`SELECT version FROM garageai_schema_migrations WHERE version = 1 LIMIT 1`;
  if (!rows[0]) throw new Error("PostgreSQL migration 001 is missing; run scripts/migrate-postgres.ts first");
}

async function inspectConflicts(db: any, bundle: LegacyBundle) {
  await verifySchema(db);
  const userIds = new Set(bundle.users.map((user) => user.id));
  const summary = {
    usersToInsert: 0, usersIdentical: 0,
    garagesToInsert: 0, garagesIdentical: 0,
    sessionsToInsert: 0, sessionsIdentical: 0,
    orphanGarages: 0, orphanSessions: 0, conflicts: 0,
  };

  for (const user of bundle.users) {
    const byId = await db`SELECT id, username, password_hash AS "passwordHash" FROM garageai_users WHERE id = ${user.id} LIMIT 1`;
    const byName = await db`SELECT id, username, password_hash AS "passwordHash" FROM garageai_users WHERE username_normalized = ${user.username.toLowerCase()} LIMIT 1`;
    if (!byId[0] && !byName[0]) summary.usersToInsert++;
    else if (byId[0]?.id === user.id && byId[0]?.username === user.username &&
             byId[0]?.passwordHash === user.passwordHash && (!byName[0] || byName[0].id === user.id)) summary.usersIdentical++;
    else summary.conflicts++;
  }

  for (const [userId, garage] of bundle.garages) {
    if (!userIds.has(userId)) {
      summary.orphanGarages++;
      continue;
    }
    const rows = await db`SELECT data FROM garageai_garages WHERE user_id = ${userId} LIMIT 1`;
    if (!rows[0]) summary.garagesToInsert++;
    else if (stableJson(rows[0].data) === stableJson(garage)) summary.garagesIdentical++;
    else summary.conflicts++;
  }

  for (const session of bundle.sessions) {
    if (!userIds.has(session.userId)) {
      summary.orphanSessions++;
      continue;
    }
    const rows = await db`
      SELECT token_hash AS "tokenHash", user_id AS "userId", csrf_secret AS "csrfSecret",
             created_at_ms::float8 AS "createdAt", expires_at_ms::float8 AS "expiresAt",
             revoked_at_ms::float8 AS "revokedAt"
      FROM garageai_sessions WHERE token_hash = ${session.tokenHash} LIMIT 1
    `;
    if (!rows[0]) summary.sessionsToInsert++;
    else if (rows[0].tokenHash.trim() === session.tokenHash && rows[0].userId === session.userId &&
             rows[0].csrfSecret === session.csrfSecret && Number(rows[0].createdAt) === session.createdAt &&
             Number(rows[0].expiresAt) === session.expiresAt && rows[0].revokedAt == null) summary.sessionsIdentical++;
    else summary.conflicts++;
  }
  return summary;
}

async function applyBundle(db: any, bundle: LegacyBundle) {
  await db.begin(async (tx: any) => {
    await verifySchema(tx);
    const userIds = new Set(bundle.users.map((user) => user.id));
    for (const user of bundle.users) {
      const byId = await tx`SELECT id, username, password_hash AS "passwordHash" FROM garageai_users WHERE id = ${user.id} LIMIT 1`;
      const byName = await tx`SELECT id, username, password_hash AS "passwordHash" FROM garageai_users WHERE username_normalized = ${user.username.toLowerCase()} LIMIT 1`;
      if (byId[0] || byName[0]) {
        if (byId[0]?.id !== user.id || byId[0]?.username !== user.username ||
            byId[0]?.passwordHash !== user.passwordHash || (byName[0] && byName[0].id !== user.id)) {
          throw new Error("Import conflict: an account ID or normalized username already has different data");
        }
        continue;
      }
      await tx`
        INSERT INTO garageai_users (id, username, password_hash, created_at)
        VALUES (${user.id}, ${user.username}, ${user.passwordHash}, ${user.createdAt})
      `;
      await tx`
        INSERT INTO garageai_garages (user_id, data)
        VALUES (${user.id}, ${tx.json(JSON.parse(JSON.stringify({
          vehicles: [], reminders: [], serviceRecords: [], fuelRecords: [],
          oemSchedules: [], garageParts: [], toFixTasks: [], tuningStages: [],
          lastUpdated: new Date(0).toISOString(),
        })) )})
        ON CONFLICT (user_id) DO NOTHING
      `;
    }

    for (const [userId, garage] of bundle.garages) {
      if (!userIds.has(userId)) continue;
      const rows = await tx`SELECT data FROM garageai_garages WHERE user_id = ${userId} LIMIT 1`;
      if (rows[0]) {
        if (stableJson(rows[0].data) !== stableJson(garage)) {
          // Newly imported accounts have a placeholder empty garage. Replace it
          // only when no user data has ever been written (revision remains zero).
          const empty = {
            vehicles: [], reminders: [], serviceRecords: [], fuelRecords: [],
            oemSchedules: [], garageParts: [], toFixTasks: [], tuningStages: [],
            lastUpdated: new Date(0).toISOString(),
          };
          const revision = await tx`SELECT revision FROM garageai_garages WHERE user_id = ${userId}`;
          if (Number(revision[0]?.revision) !== 0 || stableJson(rows[0].data) !== stableJson(empty)) {
            throw new Error("Import conflict: destination garage already contains different data");
          }
        } else {
          continue;
        }
      }
      await tx`
        INSERT INTO garageai_garages (user_id, data, updated_at, revision)
        VALUES (${userId}, ${tx.json(JSON.parse(JSON.stringify(garage)))}, now(), 0)
        ON CONFLICT (user_id) DO UPDATE
        SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, revision = 0
      `;
    }

    for (const session of bundle.sessions) {
      if (!userIds.has(session.userId)) continue;
      const rows = await tx`SELECT token_hash FROM garageai_sessions WHERE token_hash = ${session.tokenHash} LIMIT 1`;
      if (rows[0]) {
        const identical = await tx`
          SELECT 1 FROM garageai_sessions
          WHERE token_hash = ${session.tokenHash} AND user_id = ${session.userId}
            AND csrf_secret = ${session.csrfSecret}
            AND created_at_ms = ${session.createdAt}
            AND expires_at_ms = ${session.expiresAt}
            AND revoked_at_ms IS NULL
        `;
        if (identical[0]) continue;
        throw new Error("Import conflict: a session token hash already exists with different data");
      }
      await tx`
        INSERT INTO garageai_sessions (token_hash, user_id, csrf_secret, created_at_ms, expires_at_ms)
        VALUES (${session.tokenHash}, ${session.userId}, ${session.csrfSecret}, ${session.createdAt}, ${session.expiresAt})
      `;
    }
  });
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const sourceArg = args.find((arg) => arg.startsWith("--source-dir="));
  const sourceDir = path.resolve(sourceArg ? sourceArg.slice("--source-dir=".length) : "data");
  const db = postgres(connectionString, { max: 1, connect_timeout: 10, idle_timeout: 5, prepare: false, ssl: process.env.DATABASE_SSL === "true" ? "require" : false });
  try {
    const bundle = await loadBundle(sourceDir);
    const summary = await inspectConflicts(db, bundle);
    if (bundle.ownerlessGaragePresent) summary.orphanGarages++;
    if (summary.conflicts > 0) {
      console.error("Import blocked: destination conflicts detected. No data was written.");
      console.log(JSON.stringify(summary, null, 2));
      process.exitCode = 2;
      return;
    }
    if (bundle.ownerlessGaragePresent) {
      console.warn("Warning: ownerless legacy garage data was detected and will not be imported automatically.");
    }
    if (!apply) {
      console.log("DRY RUN ONLY — no rows were written.");
      console.log(JSON.stringify(summary, null, 2));
      console.log("Review counts, back up the database, then rerun with --apply to commit.");
      return;
    }
    await applyBundle(db, bundle);
    const verification = await inspectConflicts(db, bundle);
    if (verification.conflicts > 0 || verification.usersToInsert > 0 ||
        verification.garagesToInsert > 0 || verification.sessionsToInsert > 0) {
      throw new Error("Post-import verification failed; do not enable production readiness");
    }
    console.log("Legacy JSON import completed; post-import row/data comparison passed.");
    console.log(JSON.stringify({ importedBeforeApply: summary, verifiedAfterApply: verification }, null, 2));
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Legacy JSON import failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
