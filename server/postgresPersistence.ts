import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import {
  cloneGarage,
  emptyGarage,
  UserAlreadyExistsError,
  type GarageData,
  type UserRecord,
} from "./store";
import type { SessionRecord } from "./security";

type Sql = ReturnType<typeof postgres>;

export class ConcurrentGarageUpdateError extends Error {
  constructor() {
    super("Garage changed concurrently; reload the latest data before retrying.");
    this.name = "ConcurrentGarageUpdateError";
  }
}

export interface PostgresPersistenceOptions {
  connectionString: string;
  maxConnections?: number;
  ssl?: "require" | false;
  migrationsDirectory?: string;
  runMigrations?: boolean;
}

const MIGRATION_FILES = ["001_initial_postgres.sql"] as const;

/**
 * PostgreSQL repository primitives for the Cloud Run persistence cutover.
 *
 * This adapter is deliberately not selected by server.ts yet. The HTTP layer
 * still has synchronous GarageStore/session assumptions and must be refactored
 * before this class can safely replace JSON persistence.
 */
export class PostgresPersistence {
  private readonly sql: Sql;
  private initialized = false;

  constructor(private readonly options: PostgresPersistenceOptions) {
    if (!options.connectionString.trim()) {
      throw new Error("DATABASE_URL is required for PostgreSQL persistence");
    }
    this.sql = postgres(options.connectionString, {
      max: Math.max(1, Math.min(options.maxConnections ?? 5, 20)),
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      prepare: false,
      ssl: options.ssl ?? false,
      onnotice: () => undefined,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.options.runMigrations !== false) {
      // Serialize migration setup so concurrent local/test instances cannot race.
      await this.sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(7461726167654149)`;
        const directory = this.options.migrationsDirectory ?? path.resolve(process.cwd(), "db/migrations");
        for (const filename of MIGRATION_FILES) {
          const migration = await fs.readFile(path.join(directory, filename), "utf8");
          await tx.unsafe(migration);
        }
      });
    } else {
      // Production runtime identities should not need DDL privileges. Apply
      // migrations from a controlled one-off job before deploying the revision.
      const rows = await this.sql`
        SELECT version FROM garageai_schema_migrations WHERE version = 1 LIMIT 1
      `;
      if (!rows[0]) throw new Error("PostgreSQL schema migration 001 is missing; run the controlled migration job first");
    }
    this.initialized = true;
  }

  private assertInitialized(): void {
    if (!this.initialized) throw new Error("PostgresPersistence.initialize() must complete before use");
  }

  async healthCheck(): Promise<void> {
    this.assertInitialized();
    await this.sql`SELECT 1`;
  }

  async getUserByName(username: string): Promise<UserRecord | undefined> {
    this.assertInitialized();
    const rows = await this.sql`
      SELECT id, username, password_hash AS "passwordHash", to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
      FROM garageai_users
      WHERE username_normalized = ${username.trim().toLowerCase()}
      LIMIT 1
    `;
    return rows[0] as UserRecord | undefined;
  }

  async getUserById(id: string): Promise<UserRecord | undefined> {
    this.assertInitialized();
    const rows = await this.sql`
      SELECT id, username, password_hash AS "passwordHash", created_at AS "createdAt"
      FROM garageai_users
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] as UserRecord | undefined;
  }

  async listUsers(): Promise<UserRecord[]> {
    this.assertInitialized();
    const rows = await this.sql`
      SELECT id, username, password_hash AS "passwordHash", created_at AS "createdAt"
      FROM garageai_users
      ORDER BY created_at, id
    `;
    return rows as unknown as UserRecord[];
  }

  async countUsers(): Promise<number> {
    this.assertInitialized();
    const rows = await this.sql`SELECT count(*)::integer AS count FROM garageai_users`;
    return Number(rows[0]?.count ?? 0);
  }

  async createUser(username: string, passwordHash: string, id: string): Promise<UserRecord> {
    this.assertInitialized();
    try {
      return await this.sql.begin(async (tx) => {
        const rows = await tx`
          INSERT INTO garageai_users (id, username, password_hash)
          VALUES (${id}, ${username.trim()}, ${passwordHash})
          RETURNING id, username, password_hash AS "passwordHash", created_at AS "createdAt"
        `;
        await tx`
          INSERT INTO garageai_garages (user_id, data)
          VALUES (${id}, ${tx.json(JSON.parse(JSON.stringify(emptyGarage())))})
        `;
        return rows[0] as UserRecord;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UserAlreadyExistsError();
      throw error;
    }
  }

  async snapshotForUser(userId: string, create = false): Promise<GarageData> {
    const result = await this.snapshotForUserWithRevision(userId, create);
    return result.garage;
  }

  async snapshotForUserWithRevision(userId: string, create = false): Promise<{ garage: GarageData; revision: number }> {
    this.assertInitialized();
    if (create) {
      await this.sql`
        INSERT INTO garageai_garages (user_id, data)
        SELECT id, ${this.sql.json(JSON.parse(JSON.stringify(emptyGarage())))}
        FROM garageai_users WHERE id = ${userId}
        ON CONFLICT (user_id) DO NOTHING
      `;
    }
    const rows = await this.sql`
      SELECT data, revision FROM garageai_garages WHERE user_id = ${userId} LIMIT 1
    `;
    if (!rows[0]) return { garage: emptyGarage(), revision: 0 };
    return { garage: normalizeGarage(rows[0].data), revision: Number(rows[0].revision) };
  }

  async commitGarage(userId: string, snapshot: GarageData): Promise<GarageData> {
    this.assertInitialized();
    const committed = normalizeGarage(cloneGarage(snapshot));
    committed.lastUpdated = new Date().toISOString();
    const rows = await this.sql`
      INSERT INTO garageai_garages (user_id, data, updated_at)
      SELECT id, ${this.sql.json(JSON.parse(JSON.stringify(committed)))}, now()
      FROM garageai_users WHERE id = ${userId}
      ON CONFLICT (user_id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
      RETURNING data
    `;
    if (!rows[0]) throw new Error("Cannot persist garage: owner account does not exist");
    return normalizeGarage(rows[0].data);
  }

  async commitGarageVersioned(
    userId: string,
    snapshot: GarageData,
    expectedRevision: number,
  ): Promise<{ garage: GarageData; revision: number }> {
    this.assertInitialized();
    const committed = normalizeGarage(cloneGarage(snapshot));
    committed.lastUpdated = new Date().toISOString();
    const rows = await this.sql`
      UPDATE garageai_garages
      SET data = ${this.sql.json(JSON.parse(JSON.stringify(committed)))},
          updated_at = now(),
          revision = revision + 1
      WHERE user_id = ${userId} AND revision = ${expectedRevision}
      RETURNING data, revision
    `;
    if (!rows[0]) {
      const owners = await this.sql`SELECT 1 FROM garageai_users WHERE id = ${userId} LIMIT 1`;
      if (!owners[0]) throw new Error("Cannot persist garage: owner account does not exist");
      throw new ConcurrentGarageUpdateError();
    }
    return { garage: normalizeGarage(rows[0].data), revision: Number(rows[0].revision) };
  }

  async schedulePersist(userId: string, snapshot: GarageData): Promise<void> {
    await this.commitGarage(userId, snapshot);
  }

  async flush(): Promise<void> {
    // PostgreSQL writes are committed before the method resolves.
  }

  async run<T>(userId: string, mutator: (garage: GarageData) => T | Promise<T>): Promise<T> {
    this.assertInitialized();
    return await this.sql.begin(async (tx) => {
      const rows = await tx`
        SELECT g.data
        FROM garageai_garages g
        JOIN garageai_users u ON u.id = g.user_id
        WHERE g.user_id = ${userId}
        FOR UPDATE OF g
      `;
      if (!rows[0]) throw new Error("Garage owner account does not exist");
      const draft = normalizeGarage(rows[0].data);
      const result = await mutator(draft);
      draft.lastUpdated = new Date().toISOString();
      await tx`
        UPDATE garageai_garages
        SET data = ${tx.json(JSON.parse(JSON.stringify(normalizeGarage(draft))))}, updated_at = now(), revision = revision + 1
        WHERE user_id = ${userId}
      `;
      return result;
    }) as T;
  }

  async getSession(tokenHash: string): Promise<SessionRecord | undefined> {
    this.assertInitialized();
    const rows = await this.sql`
      SELECT token_hash AS "tokenHash", csrf_secret AS "csrfSecret",
             user_id AS "userId", created_at_ms::float8 AS "createdAt",
             expires_at_ms::float8 AS "expiresAt", revoked_at_ms::float8 AS "revokedAt"
      FROM garageai_sessions
      WHERE token_hash = ${tokenHash}
        AND expires_at_ms > ${Date.now()}
        AND revoked_at_ms IS NULL
      LIMIT 1
    `;
    return rows[0] as SessionRecord | undefined;
  }

  async putSession(session: SessionRecord): Promise<void> {
    this.assertInitialized();
    await this.sql`
      INSERT INTO garageai_sessions
        (token_hash, user_id, csrf_secret, created_at_ms, expires_at_ms, revoked_at_ms)
      VALUES
        (${session.tokenHash}, ${session.userId}, ${session.csrfSecret},
         ${session.createdAt}, ${session.expiresAt}, ${session.revokedAt ?? null})
      ON CONFLICT (token_hash) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        csrf_secret = EXCLUDED.csrf_secret,
        created_at_ms = EXCLUDED.created_at_ms,
        expires_at_ms = EXCLUDED.expires_at_ms,
        revoked_at_ms = EXCLUDED.revoked_at_ms
    `;
  }

  async revokeSession(tokenHash: string, now = Date.now()): Promise<void> {
    this.assertInitialized();
    await this.sql`
      UPDATE garageai_sessions SET revoked_at_ms = ${now}
      WHERE token_hash = ${tokenHash} AND revoked_at_ms IS NULL
    `;
  }

  async deleteExpiredSessions(now = Date.now()): Promise<number> {
    this.assertInitialized();
    const result = await this.sql`
      DELETE FROM garageai_sessions
      WHERE expires_at_ms <= ${now}
         OR (revoked_at_ms IS NOT NULL AND revoked_at_ms <= ${now})
    `;
    return result.count;
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
    this.initialized = false;
  }
}

function normalizeGarage(value: unknown): GarageData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid garage JSON object in PostgreSQL");
  }
  const source = value as Record<string, unknown>;
  const garage = emptyGarage();
  const keys: Array<keyof Omit<GarageData, "lastUpdated">> = [
    "vehicles", "reminders", "serviceRecords", "fuelRecords",
    "oemSchedules", "garageParts", "toFixTasks", "tuningStages",
  ];
  for (const key of keys) {
    if (!Array.isArray(source[key])) throw new Error(`Invalid garage collection: ${key}`);
    garage[key] = source[key] as unknown[];
  }
  if (typeof source.lastUpdated === "string") garage.lastUpdated = source.lastUpdated;
  return garage;
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "23505");
}
