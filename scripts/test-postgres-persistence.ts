import { randomUUID } from "node:crypto";
import {
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
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const userId = `ci-user-${suffix}`;
  const username = `ci-${suffix}`;
  const sessionHash = randomUUID().replace(/-/g, "").padEnd(64, "a").slice(0, 64);

  try {
    await repository.initialize();
    await repository.healthCheck();

    const user = await repository.createUser(username, "test-only-password-hash", userId);
    assert(user.id === userId, "createUser should return the persisted ID");
    assert(user.username === username, "createUser should return the persisted username");
    assert((await repository.getUserByName(username.toUpperCase()))?.id === userId, "username lookup should be case-insensitive");
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

    const initial = await repository.snapshotForUser(userId, true);
    assert(Array.isArray(initial.vehicles) && initial.vehicles.length === 0, "new garage should start empty");

    await repository.run(userId, (garage) => {
      garage.vehicles.push({ id: `vehicle-${suffix}`, make: "Test" });
    });
    const changed = await repository.snapshotForUser(userId);
    assert(changed.vehicles.length === 1, "run should commit the garage mutation");

    try {
      await repository.run(userId, (garage) => {
        garage.vehicles.push({ id: "must-rollback" });
        throw new Error("intentional rollback test");
      });
      throw new Error("run unexpectedly succeeded after a mutator error");
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "intentional rollback test") throw error;
    }
    const afterRollback = await repository.snapshotForUser(userId);
    assert(afterRollback.vehicles.length === 1, "failed transaction must not persist partial mutations");

    await repository.commitGarage(userId, {
      ...afterRollback,
      reminders: [{ id: `reminder-${suffix}` }],
    });
    assert((await repository.snapshotForUser(userId)).reminders.length === 1, "commitGarage should persist the supplied snapshot");

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
    await repository.revokeSession(sessionHash, now + 1);
    assert(await repository.getSession(sessionHash) === undefined, "revoked session must not be returned");
    await repository.deleteExpiredSessions(now + 120_000);

    console.log("PostgresPersistence integration checks passed.");
  } finally {
    await repository.close();
  }
}

main().catch((error) => {
  console.error("PostgresPersistence integration checks failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
