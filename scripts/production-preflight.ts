import postgres from "postgres";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL is required");
if (process.env.GARAGE_ALLOW_EPHEMERAL_STORAGE === "true") {
  throw new Error("GARAGE_ALLOW_EPHEMERAL_STORAGE must be unset for production");
}
if (process.env.GARAGE_POSTGRES_READY === "true") {
  console.warn("Preflight is running with GARAGE_POSTGRES_READY=true; keep the flag unset until all external restore and canary checks pass.");
}

const db = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
});

try {
  await db`SELECT 1`;
  const migrations = await db`SELECT version FROM garageai_schema_migrations ORDER BY version`;
  const versions = migrations.map((row) => Number(row.version));
  if (versions.length === 0 || versions[versions.length - 1] !== 2) {
    throw new Error("PostgreSQL schema version 2 is not applied");
  }
  const [users, garages, sessions] = await Promise.all([
    db`SELECT count(*)::integer AS count FROM garageai_users`,
    db`SELECT count(*)::integer AS count FROM garageai_garages`,
    db`SELECT count(*)::integer AS count FROM garageai_sessions WHERE revoked_at_ms IS NULL AND expires_at_ms > ${Date.now()}`,
  ]);
  console.log(JSON.stringify({
    status: "database-ready-for-review",
    schemaVersion: versions[versions.length - 1],
    users: Number(users[0]?.count ?? 0),
    garages: Number(garages[0]?.count ?? 0),
    activeSessions: Number(sessions[0]?.count ?? 0),
  }));
} finally {
  await db.end({ timeout: 5 });
}
