import type { GarageData } from "./store";

const RECORD_KEYS = [
  "reminders", "serviceRecords", "fuelRecords", "oemSchedules",
  "garageParts", "toFixTasks", "tuningStages",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateGarageBackup(input: unknown): Omit<GarageData, "lastUpdated"> {
  if (!isObject(input) || !Array.isArray(input.vehicles)) {
    throw new Error("Некорректный формат файла резервной копии");
  }

  const vehicles = input.vehicles;
  const vehicleIds = new Set<string>();
  for (const vehicle of vehicles) {
    if (!isObject(vehicle) || typeof vehicle.id !== "string" || !vehicle.id.trim() ||
        typeof vehicle.make !== "string" || !vehicle.make.trim() ||
        typeof vehicle.model !== "string" || !vehicle.model.trim()) {
      throw new Error("В копии есть некорректный автомобиль");
    }
    if (vehicleIds.has(vehicle.id)) throw new Error("В копии повторяется ID автомобиля");
    vehicleIds.add(vehicle.id);
  }

  const result = { vehicles } as Omit<GarageData, "lastUpdated">;
  for (const key of RECORD_KEYS) {
    const records = input[key] === undefined ? [] : input[key];
    if (!Array.isArray(records)) throw new Error("Некорректный список: " + key);
    const ids = new Set<string>();
    for (const record of records) {
      if (!isObject(record) || typeof record.id !== "string" || !record.id.trim() ||
          typeof record.vehicleId !== "string" ||
          (!vehicleIds.has(record.vehicleId) && !(key === "garageParts" && record.vehicleId === "all"))) {
        throw new Error("Некорректная запись или ссылка на автомобиль: " + key);
      }
      if (ids.has(record.id)) throw new Error("В копии повторяется ID записи: " + key);
      ids.add(record.id);
    }
    result[key] = records;
  }
  return result;
}
