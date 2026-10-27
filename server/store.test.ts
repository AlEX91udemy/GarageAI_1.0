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
});
