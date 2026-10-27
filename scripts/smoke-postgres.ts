import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { ConcurrentGarageUpdateError, PostgresPersistence } from "../server/postgresPersistence";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
  const userA = { id: `smoke-a-${suffix}`, username: `smokea-${suffix}` };
  const userB = { id: `smoke-b-${suffix}`, username: `smokeb-${suffix}` };
  const sessionHash = randomUUID().replace(/-/g, "").repeat(2).slice(0, 64);
  const rotatedHash = randomUUID().replace(/-/g, "").repeat(2).slice(0, 64);
  const repository = new PostgresPersistence({
    connectionString,
    maxConnections: 2,
    ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
    runMigrations: false,
  });
  const cleanup = postgres(connectionString, {
    max: 1,
    prepare: false,
    ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
  });

  try {
    await repository.initialize();
    await repository.healthCheck();

    await repository.createUser(userA.username, "scrypt$smoke-test-only", userA.id);
    await repository.createUser(userB.username, "scrypt$smoke-test-only", userB.id);

    await repository.run(userA.id, (garage) => {
      garage.vehicles.push({ id: "smoke-only-car-a", make: "SmokeTest" });
    });
    await repository.run(userB.id, (garage) => {
      garage.vehicles.push({ id: "smoke-only-car-b", make: "SmokeTest" });
    });
    const garageA = await repository.snapshotForUserWithRevision(userA.id);
    const garageB = await repository.snapshotForUserWithRevision(userB.id);
    assert(garageA.garage.vehicles.length === 1 && (garageA.garage.vehicles[0] as { id: string }).id === "smoke-only-car-a", "user A garage isolation failed");
    assert(garageB.garage.vehicles.length === 1 && (garageB.garage.vehicles[0] as { id: string }).id === "smoke-only-car-b", "user B garage isolation failed");

    const updated = await repository.commitGarageVersioned(userA.id, garageA.garage, garageA.revision);
    assert(updated.revision === garageA.revision + 1, "revision should increment on commit");
    let staleRejected = false;
    try {
      await repository.commitGarageVersioned(userA.id, garageA.garage, garageA.revision);
    } catch (error) {
      staleRejected = error instanceof ConcurrentGarageUpdateError;
    }
    assert(staleRejected, "stale concurrent write was not rejected");

    const now = Date.now();
    const session = {
      tokenHash: sessionHash,
      csrfSecret: "smoke-test-only-csrf",
      userId: userA.id,
      createdAt: now,
      expiresAt: now + 60_000,
    };
    await repository.putSession(session);
    await repository.rotateSession(sessionHash, { ...session, tokenHash: rotatedHash }, now + 1);
    assert(await repository.getSession(sessionHash) === undefined, "old session token remained active after rotation");
    assert((await repository.getSession(rotatedHash))?.userId === userA.id, "rotated session was not active");
    await repository.revokeSession(rotatedHash, now + 2);
    assert(await repository.getSession(rotatedHash) === undefined, "revoked session remained active");

    console.log("PostgreSQL smoke test passed: schema, connectivity, tenant isolation, optimistic concurrency, and session lifecycle.");
  } finally {
    await cleanup`DELETE FROM garageai_users WHERE id IN (${userA.id}, ${userB.id})`.catch(() => undefined);
    await cleanup.end({ timeout: 5 });
    await repository.close();
  }
}

main().catch((error) => {
  console.error("PostgreSQL smoke test failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
