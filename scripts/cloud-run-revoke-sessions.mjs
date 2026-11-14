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
  const result = await db.unsafe(`UPDATE garageai_sessions SET revoked_at_ms = ${Date.now()} WHERE revoked_at_ms IS NULL`);
  console.log(`Revoked ${result.count} active PostgreSQL sessions.`);
} finally {
  await db.end({ timeout: 5 });
}
