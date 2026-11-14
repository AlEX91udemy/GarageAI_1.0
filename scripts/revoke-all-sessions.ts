import postgres from "postgres";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL is required");

const db = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
});

try {
  const result = await db`
    UPDATE garageai_sessions
    SET revoked_at_ms = ${Date.now()}
    WHERE revoked_at_ms IS NULL
  `;
  console.log(`Revoked ${result.count} active PostgreSQL sessions.`);
} finally {
  await db.end({ timeout: 5 });
}
