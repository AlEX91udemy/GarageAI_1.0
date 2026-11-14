import postgres from "postgres";

const connectionString = process.env.DATABASE_URL?.trim();
const host = process.env.DATABASE_HOST?.trim();
const port = Number(process.env.DATABASE_PORT || 5432);
if (!connectionString || !host) throw new Error("DATABASE_URL and DATABASE_HOST are required");

const parsed = new URL(connectionString);
const db = postgres({
  host,
  port,
  username: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.slice(1),
  max: 1,
  prepare: false,
  ssl: false,
});

try {
  await db.unsafe("SELECT 1");
  const [schema, users, garages, sessions] = await Promise.all([
    db.unsafe("SELECT max(version)::integer AS version FROM garageai_schema_migrations"),
    db.unsafe("SELECT count(*)::integer AS count FROM garageai_users"),
    db.unsafe("SELECT count(*)::integer AS count FROM garageai_garages"),
    db.unsafe(`SELECT count(*)::integer AS count FROM garageai_sessions WHERE revoked_at_ms IS NULL AND expires_at_ms > ${Date.now()}`),
  ]);
  const version = Number(schema[0]?.version ?? 0);
  if (version !== 3) throw new Error(`Expected schema version 3, got ${version}`);
  console.log(JSON.stringify({
    status: "database-ready-for-review",
    schemaVersion: version,
    users: Number(users[0]?.count ?? 0),
    garages: Number(garages[0]?.count ?? 0),
    activeSessions: Number(sessions[0]?.count ?? 0),
  }));
} finally {
  await db.end({ timeout: 5 });
}
