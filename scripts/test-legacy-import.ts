import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import postgres from "postgres";
import { PostgresPersistence } from "../server/postgresPersistence";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function runImporter(sourceDir: string, apply: boolean, connectionString: string) {
  const cli = path.resolve("node_modules/tsx/dist/cli.mjs");
  const script = path.resolve("scripts/import-legacy-json.ts");
  const args = [cli, script, `--source-dir=${sourceDir}`];
  if (apply) args.push("--apply");
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, DATABASE_URL: connectionString },
  });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for importer integration tests");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const userId = `import-user-${suffix}`;
  const username = `import-${suffix}`;
  const tokenHash = randomUUID().replace(/-/g, "").repeat(2).slice(0, 64);
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), "garageai-legacy-import-"));
  const repository = new PostgresPersistence({ connectionString, maxConnections: 1 });
  const db = postgres(connectionString, { max: 1, prepare: false, ssl: process.env.DATABASE_SSL === "true" ? "require" : false });

  try {
    await repository.initialize();
    const now = Date.now();
    const bundle = {
      users: [{
        id: userId,
        username,
        passwordHash: "scrypt$16384$8$1$Y2ktc2FsdA==$Y2ktcGFzc3dvcmQtaGFzaA==",
        createdAt: new Date(now).toISOString(),
      }],
      garages: {
        [userId]: {
          vehicles: [{ id: `car-${suffix}`, make: "Test" }],
          reminders: [],
          serviceRecords: [],
          fuelRecords: [],
          oemSchedules: [],
          garageParts: [],
          toFixTasks: [],
          tuningStages: [],
          lastUpdated: new Date(now).toISOString(),
        },
      },
      sessions: [{
        tokenHash,
        csrfSecret: "ci-only-csrf-secret",
        userId,
        createdAt: now,
        expiresAt: now + 60 * 60 * 1000,
      }],
    };
    await fs.writeFile(path.join(sourceDir, "users.json"), JSON.stringify(bundle.users), "utf8");
    await fs.writeFile(path.join(sourceDir, "garage_store.json"), JSON.stringify({ version: 2, garages: bundle.garages }), "utf8");
    await fs.writeFile(path.join(sourceDir, "sessions.json"), JSON.stringify(bundle.sessions), "utf8");

    const dryRun = runImporter(sourceDir, false, connectionString);
    assert(dryRun.status === 0 && dryRun.stdout.includes("DRY RUN ONLY"), "dry run should complete without writes");
    assert((await db`SELECT 1 FROM garageai_users WHERE id = ${userId}`).length === 0, "dry run must not write user rows");

    const applied = runImporter(sourceDir, true, connectionString);
    assert(applied.status === 0, "apply should import valid users, garages, and sessions");
    assert((await db`SELECT 1 FROM garageai_users WHERE id = ${userId}`).length === 1, "apply should import user");
    const garageRows = await db`SELECT data FROM garageai_garages WHERE user_id = ${userId}`;
    assert(garageRows.length === 1 && garageRows[0].data.vehicles[0].id === `car-${suffix}`, "apply should import garage data");
    assert((await db`SELECT 1 FROM garageai_sessions WHERE token_hash = ${tokenHash}`).length === 1, "apply should import active session");

    const repeated = runImporter(sourceDir, true, connectionString);
    assert(repeated.status === 0 && repeated.stdout.includes('"usersIdentical": 1'), "repeat import should be idempotent for identical records");

    bundle.users[0].passwordHash = "scrypt$different-hash";
    await fs.writeFile(path.join(sourceDir, "users.json"), JSON.stringify(bundle.users), "utf8");
    const conflict = runImporter(sourceDir, true, connectionString);
    assert(conflict.status === 2, "conflicting destination user data must block import");
    assert((await db`SELECT password_hash FROM garageai_users WHERE id = ${userId}`)[0].password_hash !== bundle.users[0].passwordHash, "conflict must not overwrite existing account");

    console.log("Legacy JSON importer integration checks passed.");
  } finally {
    await db`DELETE FROM garageai_users WHERE id = ${userId}`;
    await db.end({ timeout: 5 });
    await repository.close();
    await fs.rm(sourceDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Legacy JSON importer integration checks failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
