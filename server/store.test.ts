import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GarageStore, emptyGarage } from "./store";

const tempDirs: string[] = [];

function makeStore() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "garageai-store-test-"));
  tempDirs.push(directory);
  return new GarageStore(path.join(directory, "garage_store.json"), () => emptyGarage());
}

afterEach(() => {
  while (tempDirs.length) {
    const directory = tempDirs.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("GarageStore tenant isolation and persistence", () => {
  it("keeps vehicle and service data isolated by user ID", async () => {
    const store = makeStore();
    await store.createUser("alice", "test-hash-a", "user-a");
    await store.createUser("bob", "test-hash-b", "user-b");

    await store.run("user-a", (garage) => {
      garage.vehicles.push({ id: "alice-car", make: "Toyota" });
      garage.serviceRecords.push({ id: "alice-service", vehicleId: "alice-car" });
    });
    await store.run("user-b", (garage) => {
      garage.vehicles.push({ id: "bob-car", make: "Volvo" });
      garage.serviceRecords.push({ id: "bob-service", vehicleId: "bob-car" });
    });

    expect(store.snapshotForUser("user-a").vehicles).toEqual([
      { id: "alice-car", make: "Toyota" },
    ]);
    expect(store.snapshotForUser("user-a").serviceRecords).toEqual([
      { id: "alice-service", vehicleId: "alice-car" },
    ]);
    expect(store.snapshotForUser("user-b").vehicles).toEqual([
      { id: "bob-car", make: "Volvo" },
    ]);
    expect(store.snapshotForUser("user-b").serviceRecords).toEqual([
      { id: "bob-service", vehicleId: "bob-car" },
    ]);
  });

  it("serializes concurrent writes without dropping another user's garage", async () => {
    const store = makeStore();
    await store.createUser("alice", "test-hash-a", "user-a");
    await store.createUser("bob", "test-hash-b", "user-b");

    await Promise.all([
      store.run("user-a", async (garage) => {
        await Promise.resolve();
        garage.vehicles.push({ id: "alice-car" });
      }),
      store.run("user-b", async (garage) => {
        await Promise.resolve();
        garage.vehicles.push({ id: "bob-car" });
      }),
    ]);

    await store.flush();
    expect(store.snapshotForUser("user-a").vehicles).toEqual([{ id: "alice-car" }]);
    expect(store.snapshotForUser("user-b").vehicles).toEqual([{ id: "bob-car" }]);

    const reloaded = new GarageStore(
      path.join(path.dirname((store as any).dataFile), "garage_store.json"),
      () => emptyGarage(),
    );
    expect(reloaded.snapshotForUser("user-a").vehicles).toEqual([{ id: "alice-car" }]);
    expect(reloaded.snapshotForUser("user-b").vehicles).toEqual([{ id: "bob-car" }]);
  });

  it("does not retain caller-owned object references after commit", async () => {
    const store = makeStore();
    await store.createUser("alice", "test-hash-a", "user-a");
    const input = emptyGarage();
    input.vehicles.push({ id: "safe-car" });

    await store.commitGarage("user-a", input);
    (input.vehicles[0] as { id: string }).id = "mutated-after-commit";

    expect(store.snapshotForUser("user-a").vehicles).toEqual([{ id: "safe-car" }]);
  });

  it("rejects concurrent duplicate usernames atomically", async () => {
    const store = makeStore();
    const results = await Promise.allSettled([
      store.createUser("Alex", "hash-a", "user-a"),
      store.createUser("alex", "hash-b", "user-b"),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toMatchObject({ name: "UserAlreadyExistsError" });
    }
    expect(store.countUsers()).toBe(1);
    expect(store.getUserByName("ALEX")).toBeDefined();
  });

  it("deletes only the selected user's account, garage and email challenges", async () => {
    const store = makeStore();
    await store.createUser("alice", "test-hash-a", "user-a", "alice@example.test");
    await store.createUser("bob", "test-hash-b", "user-b", "bob@example.test");
    await store.run("user-a", (garage) => { garage.vehicles.push({ id: "alice-car" }); });
    await store.run("user-b", (garage) => { garage.vehicles.push({ id: "bob-car" }); });
    await store.createEmailChallenge({ id: "alice-challenge", userId: "user-a", codeHash: "a".repeat(64), expiresAtMs: Date.now() + 60_000, attempts: 0, createdAtMs: Date.now() });

    await expect(store.deleteUser("user-a")).resolves.toBe(true);
    expect(store.getUserById("user-a")).toBeUndefined();
    expect(store.getUserByEmail("alice@example.test")).toBeUndefined();
    expect(store.getUserById("user-b")).toBeDefined();
    expect(store.snapshotForUser("user-b").vehicles).toEqual([{ id: "bob-car" }]);
    await expect(store.verifyEmailChallenge("user-a", "000000", "secret")).resolves.toBe(false);
    await expect(store.deleteUser("user-a")).resolves.toBe(false);
  });

  it("keeps API-created email accounts pending until the challenge is verified", async () => {
    const store = makeStore();
    await store.createUserWithEmailState("pending", "hash", "user-pending", "pending@example.test", null);
    expect(store.getUserByEmail("pending@example.test")?.emailVerifiedAt).toBeNull();
    await expect(store.markEmailVerified("user-pending", "2026-11-14T00:00:00.000Z")).resolves.toBe(true);
    expect(store.getUserByEmail("pending@example.test")?.emailVerifiedAt).toBe("2026-11-14T00:00:00.000Z");
  });

  it("resets only the account password using a single-use password-reset code", async () => {
    const store = makeStore();
    await store.createUser("alice", "old-hash", "user-a", "alice@example.test");
    await store.createUser("bob", "bob-hash", "user-b", "bob@example.test");
    const now = Date.now();
    const code = "123456";
    const { hashEmailCode } = await import("./emailCodeAuth");
    await store.createEmailChallenge({ id: "reset-a", userId: "user-a", codeHash: hashEmailCode("reset-a", code, "secret"), expiresAtMs: now + 60_000, attempts: 0, createdAtMs: now, purpose: "password_reset" });

    await expect(store.resetPasswordWithEmailChallenge("user-a", code, "secret", "new-hash", now + 1)).resolves.toBe(true);
    expect(store.getUserById("user-a")?.passwordHash).toBe("new-hash");
    expect(store.getUserById("user-b")?.passwordHash).toBe("bob-hash");
    await expect(store.resetPasswordWithEmailChallenge("user-a", code, "secret", "replayed-hash", now + 2)).resolves.toBe(false);
    expect(store.getUserById("user-a")?.passwordHash).toBe("new-hash");
  });

});
