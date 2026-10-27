import fs from "node:fs";
import path from "node:path";

const schemaPath = path.resolve("db/migrations/001_initial_postgres.sql");
const sql = fs.readFileSync(schemaPath, "utf8");
const required = [
  /CREATE TABLE IF NOT EXISTS garageai_users/i,
  /username_normalized text GENERATED ALWAYS AS \(lower\(btrim\(username\)\)\) STORED/i,
  /garageai_users_username_normalized_uq/i,
  /CREATE TABLE IF NOT EXISTS garageai_garages/i,
  /user_id text PRIMARY KEY REFERENCES garageai_users\(id\) ON DELETE CASCADE/i,
  /jsonb_typeof\(data\) = 'object'/i,
  /CREATE TABLE IF NOT EXISTS garageai_sessions/i,
  /token_hash char\(64\) PRIMARY KEY/i,
  /user_id text NOT NULL REFERENCES garageai_users\(id\) ON DELETE CASCADE/i,
  /expires_at_ms bigint NOT NULL/i,
  /revoked_at_ms bigint/i,
  /INSERT INTO garageai_schema_migrations/i,
  /ON CONFLICT \(version\) DO NOTHING/i,
];

const missing = required.filter((pattern) => !pattern.test(sql));
if (missing.length) {
  console.error("PostgreSQL schema contract failed; missing requirements:");
  for (const pattern of missing) console.error(`- ${pattern}`);
  process.exitCode = 1;
} else {
  console.log("PostgreSQL schema contract passed.");
}
