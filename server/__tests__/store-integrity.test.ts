import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { GarageStore, emptyGarage } from "../store";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "garageai-store-test-"));
}

describe("GarageStore — транзакционная целостность и изоляция (DEF-11)", () => {
  let tempDir: string;
  let dbFile: string;

  beforeEach(() => {
    tempDir = createTempDir();
    dbFile = path.join(tempDir, "garage_store.json");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("Тест A: откатывает изменения гаража пользователя A, если во время операции возникло исключение", async () => {
    const store = new GarageStore(dbFile, () => emptyGarage());
    await store.createUser("user_a", "hash_a", "user-a");

    await store.run("user-a", (garage) => {
      garage.vehicles.push({ id: "car-a1", make: "Toyota", model: "Camry", currentMileage: 50000 });
      garage.serviceRecords.push({ id: "rec-a1", vehicleId: "car-a1", title: "Замена масла" });
    });

    await expect(
      store.run("user-a", (garage) => {
        garage.vehicles.push({ id: "car-corrupted", make: "Broken", model: "Car" });
        (garage.vehicles[0] as any).currentMileage = 999999;
        garage.serviceRecords.unshift({ id: "rec-corrupted", vehicleId: "car-a1" });
        throw new Error("Сбой на этапе пост-обработки запчастей");
      })
    ).rejects.toThrow("Сбой на этапе пост-обработки запчастей");

    const inMemory = store.snapshotForUser("user-a");
    expect(inMemory.vehicles).toHaveLength(1);
    expect((inMemory.vehicles[0] as any).id).toBe("car-a1");
    expect((inMemory.vehicles[0] as any).currentMileage).toBe(50000);
    expect(inMemory.serviceRecords).toHaveLength(1);

    const reloadedStore = new GarageStore(dbFile, () => emptyGarage());
    const onDisk = reloadedStore.snapshotForUser("user-a");
    expect(onDisk.vehicles).toHaveLength(1);
    expect((onDisk.vehicles[0] as any).currentMileage).toBe(50000);
    expect(onDisk.serviceRecords).toHaveLength(1);
  });

  it("Тест B: ошибка в гараже A не попадает на диск при последующем успешном сохранении гаража B", async () => {
    const store = new GarageStore(dbFile, () => emptyGarage());
    await store.createUser("user_a", "hash_a", "user-a");
    await store.createUser("user_b", "hash_b", "user-b");

    await store.run("user-a", (g) => {
      g.vehicles.push({ id: "car-a", make: "BMW", model: "X5" });
    });
    await store.run("user-b", (g) => {
      g.vehicles.push({ id: "car-b", make: "Audi", model: "A6" });
    });

    await expect(
      store.run("user-a", (g) => {
        g.vehicles.push({ id: "car-a-dirty", make: "Dirty", model: "State" });
        throw new Error("Validation or runtime error in A");
      })
    ).rejects.toThrow("Validation or runtime error in A");

    await store.run("user-b", (g) => {
      g.fuelRecords.push({ id: "fuel-b1", vehicleId: "car-b", liters: 55 });
    });

    const reloaded = new GarageStore(dbFile, () => emptyGarage());
    const garageA = reloaded.snapshotForUser("user-a");
    const garageB = reloaded.snapshotForUser("user-b");

    expect(garageA.vehicles).toEqual([{ id: "car-a", make: "BMW", model: "X5" }]);
    expect(garageB.vehicles).toEqual([{ id: "car-b", make: "Audi", model: "A6" }]);
    expect(garageB.fuelRecords).toEqual([{ id: "fuel-b1", vehicleId: "car-b", liters: 55 }]);
  });

  it("Тест C: сериализует параллельные мутации одного и разных гаражей без потери обновлений", async () => {
    const store = new GarageStore(dbFile, () => emptyGarage());
    await store.createUser("user_a", "hash_a", "user-a");
    await store.createUser("user_b", "hash_b", "user-b");

    const ops = [
      ...Array.from({ length: 10 }, (_, idx) =>
        store.run("user-a", async (g) => {
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          g.toFixTasks.push({ id: `task-a-${idx}`, title: `Task ${idx}` });
        })
      ),
      ...Array.from({ length: 5 }, (_, idx) =>
        store.run("user-b", async (g) => {
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          g.garageParts.push({ id: `part-b-${idx}`, name: `Part ${idx}` });
        })
      ),
    ];

    await Promise.all(ops);

    const reloaded = new GarageStore(dbFile, () => emptyGarage());
    const garageA = reloaded.snapshotForUser("user-a");
    const garageB = reloaded.snapshotForUser("user-b");

    expect(garageA.toFixTasks).toHaveLength(10);
    expect(garageA.garageParts).toHaveLength(0);
    expect(garageB.garageParts).toHaveLength(5);
    expect(garageB.toFixTasks).toHaveLength(0);
  });

  it("Тест D: при ошибке записи на диск не повреждает файл, не расходится с памятью и восстанавливается", async () => {
    const store = new GarageStore(dbFile, () => emptyGarage());
    await store.createUser("user_a", "hash_a", "user-a");

    await store.run("user-a", (g) => {
      g.vehicles.push({ id: "car-stable", make: "Honda", model: "Civic" });
    });

    const renameSpy = vi.spyOn(fs, "renameSync").mockImplementationOnce(() => {
      throw new Error("ENOSPC: no space left on device");
    });

    await expect(
      store.run("user-a", (g) => {
        g.vehicles.push({ id: "car-unpersisted", make: "Ghost", model: "Car" });
      })
    ).rejects.toThrow("ENOSPC");

    expect(store.getLastPersistError()?.message).toContain("ENOSPC");

    const filesInDir = fs.readdirSync(tempDir);
    expect(filesInDir.some((f) => f.endsWith(".tmp"))).toBe(false);

    expect(store.snapshotForUser("user-a").vehicles).toEqual([
      { id: "car-stable", make: "Honda", model: "Civic" },
    ]);

    renameSpy.mockRestore();
    const reloaded = new GarageStore(dbFile, () => emptyGarage());
    expect(reloaded.snapshotForUser("user-a").vehicles).toEqual([
      { id: "car-stable", make: "Honda", model: "Civic" },
    ]);

    await store.run("user-a", (g) => {
      g.vehicles.push({ id: "car-recovered", make: "Mazda", model: "3" });
    });
    expect(store.getLastPersistError()).toBeNull();
    expect(new GarageStore(dbFile, () => emptyGarage()).snapshotForUser("user-a").vehicles).toHaveLength(2);
  });

  it("Тест E: полностью восстанавливает пользователей и гаражи после резервного копирования и перезапуска", async () => {
    const store = new GarageStore(dbFile, () => emptyGarage());
    await store.createUser("alice", "hash_alice", "u-alice");
    await store.createUser("bob", "hash_bob", "u-bob");

    await store.run("u-alice", (g) => {
      g.vehicles.push({ id: "v-1", make: "Lada", model: "Vesta" });
      g.reminders.push({ id: "r-1", vehicleId: "v-1", kind: "osago", startDate: "2026-01-15" });
    });
    await store.run("u-bob", (g) => {
      g.vehicles.push({ id: "v-2", make: "Kia", model: "Rio" });
      g.tuningStages.push({ id: "t-1", vehicleId: "v-2", name: "Stage 1" });
    });

    const backupDir = createTempDir();
    const backupDbFile = path.join(backupDir, "garage_store.json");
    const backupUsersFile = path.join(backupDir, "users.json");
    fs.copyFileSync(dbFile, backupDbFile);
    fs.copyFileSync(path.join(tempDir, "users.json"), backupUsersFile);

    const restoredStore = new GarageStore(backupDbFile, () => emptyGarage());
    expect(restoredStore.countUsers()).toBe(2);
    expect(restoredStore.getUserByName("alice")?.id).toBe("u-alice");
    expect(restoredStore.getUserByName("bob")?.id).toBe("u-bob");

    expect(restoredStore.snapshotForUser("u-alice").vehicles).toEqual([
      { id: "v-1", make: "Lada", model: "Vesta" },
    ]);
    expect(restoredStore.snapshotForUser("u-alice").reminders).toEqual([
      { id: "r-1", vehicleId: "v-1", kind: "osago", startDate: "2026-01-15" },
    ]);
    expect(restoredStore.snapshotForUser("u-bob").tuningStages).toEqual([
      { id: "t-1", vehicleId: "v-2", name: "Stage 1" },
    ]);

    fs.rmSync(backupDir, { recursive: true, force: true });
  });
});
