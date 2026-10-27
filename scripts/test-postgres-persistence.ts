import { randomUUID } from "node:crypto";
import {
  ConcurrentGarageUpdateError,
  PostgresPersistence,
} from "../server/postgresPersistence";
import { UserAlreadyExistsError } from "../server/store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for PostgreSQL persistence integration tests");

  const repository = new PostgresPersistence({ connectionString, maxConnections: 2 });
  const peerRepository = new PostgresPersistence({ connectionString, maxConnections: 1, runMigrations: false });
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const userId = `ci-user-${suffix}`;
  const username = `ci-${suffix}`;
  const email = `ci-${suffix}@example.test`;
  const sessionHash = randomUUID().replace(/-/g, "").padEnd(64, "a").slice(0, 64);

  try {
    await repository.initialize();
    await peerRepository.initialize();
    await repository.healthCheck();

    const user = await repository.createUser(username, "test-only-password-hash", userId, email);
    assert(user.id === userId, "createUser should return the persisted ID");
    assert(user.username === username, "createUser should return the persisted username");
    assert((await repository.getUserByName(username.toUpperCase()))?.id === userId, "username lookup should be case-insensitive");
    assert((await repository.getUserByEmail(email.toUpperCase()))?.id === userId, "email lookup should be case-insensitive");
    assert((await repository.getUserById(userId))?.email === email, "ID lookup should include account email");
    assert((await repository.getUserById(userId))?.id === userId, "ID lookup should return the persisted user");
    assert((await repository.listUsers()).some((item) => item.id === userId), "listUsers should include the persisted user");
    assert((await repository.countUsers()) >= 1, "countUsers should report at least one user");

    let duplicateRejected = false;
    try {
      await repository.createUser(` ${username.toUpperCase()} `, "test-only", `duplicate-${suffix}`);
    } catch (error) {
      duplicateRejected = error instanceof UserAlreadyExistsError;
    }
    assert(duplicateRejected, "normalized duplicate usernames must be rejected");

    const emailCodeNow = Date.now();
    const emailCodeHash = "a".repeat(64);
    const emailCodeStored = await repository.putEmailLoginCode(email, userId, emailCodeHash, emailCodeNow + 600_000, emailCodeNow, 60_000);
    assert(emailCodeStored, "first email login code should be stored");
    const cooldownRejected = await peerRepository.putEmailLoginCode(email, userId, "b".repeat(64), emailCodeNow + 600_000, emailCodeNow + 1_000, 60_000);
    assert(!cooldownRejected, "concurrent database clients must respect the email code resend cooldown");
    assert((await repository.getEmailLoginCode(email))?.codeHash === emailCodeHash, "email login code hash should be persisted");
    assert(await repository.consumeEmailLoginCode(email, "b".repeat(64), emailCodeNow + 2_000, 5) === null, "incorrect email code should not authenticate");
    assert((await repository.getEmailLoginCode(email))?.attempts === 1, "incorrect email code should increment attempts");
    assert(await peerRepository.consumeEmailLoginCode(email, emailCodeHash, emailCodeNow + 3_000, 5) === userId, "correct email code should return its account ID");
    assert(await repository.getEmailLoginCode(email) === undefined, "successful email code should be consumed");

    const initial = await repository.snapshotForUserWithRevision(userId, true);
    assert(Array.isArray(initial.garage.vehicles) && initial.garage.vehicles.length === 0, "new garage should start empty");
    assert(initial.revision === 0, "new garage should start at revision zero");

    await repository.run(userId, (garage) => {
      garage.vehicles.push({ id: `vehicle-${suffix}`, make: "Test" });
    });
    const changed = await repository.snapshotForUserWithRevision(userId);
    assert(changed.garage.vehicles.length === 1, "run should commit the garage mutation");
    assert(changed.revision === 1, "transactional mutation should increment the revision");

    try {
      await repository.run(userId, (garage) => {
        garage.vehicles.push({ id: "must-rollback" });
        throw new Error("intentional rollback test");
      });
      throw new Error("run unexpectedly succeeded after a mutator error");
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "intentional rollback test") throw error;
    }
    const afterRollback = await repository.snapshotForUserWithRevision(userId);
    assert(afterRollback.garage.vehicles.length === 1, "failed transaction must not persist partial mutations");
    assert(afterRollback.revision === 1, "failed transaction must not increment the revision");

    const committed = await repository.commitGarageVersioned(userId, {
      ...afterRollback.garage,
      reminders: [{ id: "reminder-" + suffix }],
    }, afterRollback.revision);
    assert(committed.revision === 2, "versioned commit should increment the revision");
    assert((await repository.snapshotForUser(userId)).reminders.length === 1, "versioned commit should persist the supplied snapshot");

    let staleWriteRejected = false;
    try {
      await repository.commitGarageVersioned(userId, afterRollback.garage, afterRollback.revision);
    } catch (error) {
      staleWriteRejected = error instanceof ConcurrentGarageUpdateError;
    }
    assert(staleWriteRejected, "stale snapshots must be rejected instead of overwriting newer data");

    const rateKey = `ci-rate-${suffix}`;
    const rateNow = Date.now();
    const firstHit = await repository.consumeRateLimit("integration", rateKey, 2, 60_000, rateNow);
    const secondHit = await peerRepository.consumeRateLimit("integration", rateKey, 2, 60_000, rateNow + 1);
    const thirdHit = await repository.consumeRateLimit("integration", rateKey, 2, 60_000, rateNow + 2);
    assert(firstHit.allowed && firstHit.count === 1, "first shared rate-limit hit should be allowed");
    assert(secondHit.allowed && secondHit.count === 2, "second database client should share the same counter");
    assert(!thirdHit.allowed && thirdHit.count === 3, "rate limit must be enforced across independent repository instances");
    assert(thirdHit.retryAfterMs > 0, "rate limit should report remaining window time");
    await peerRepository.resetRateLimit("integration", rateKey);
    const afterReset = await repository.consumeRateLimit("integration", rateKey, 2, 60_000, rateNow + 3);
    assert(afterReset.allowed && afterReset.count === 1, "reset should clear a shared rate-limit bucket");

    const now = Date.now();
    const session = {
      tokenHash: sessionHash,
      csrfSecret: "test-only-csrf",
      userId,
      createdAt: now,
      expiresAt: now + 60_000,
    };
    await repository.putSession(session);
    assert((await repository.getSession(sessionHash))?.userId === userId, "session should be readable by token hash");
    const rotatedHash = randomUUID().replace(/-/g, "").repeat(2).slice(0, 64);
    await repository.rotateSession(sessionHash, { ...session, tokenHash: rotatedHash, expiresAt: now + 90_000 }, now + 1);
    assert(await repository.getSession(sessionHash) === undefined, "previous session token must be revoked during rotation");
    assert((await repository.getSession(rotatedHash))?.userId === userId, "rotated session should be active");
    await repository.revokeSession(rotatedHash, now + 2);
    assert(await repository.getSession(rotatedHash) === undefined, "revoked session must not be returned");
    await repository.deleteExpiredSessions(now + 120_000);

    console.log("PostgresPersistence integration checks passed.");
  } finally {
    await peerRepository.close();
    await repository.close();
  }
}

main().catch((error) => {
  console.error("PostgresPersistence integration checks failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
