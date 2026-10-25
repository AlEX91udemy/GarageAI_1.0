import type { GarageData } from "./store";

const RECORD_KEYS = [
  "reminders",
  "serviceRecords",
  "fuelRecords",
  "oemSchedules",
  "garageParts",
  "toFixTasks",
  "tuningStages",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cleanRecord(source: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(source)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    clean[k] = v;
  }
  return clean;
}

export function validateGarageBackup(input: unknown): Omit<GarageData, "lastUpdated"> {
  if (!isObject(input) || !Array.isArray(input.vehicles)) {
    throw new Error("Некорректный формат файла резервной копии");
  }

  const vehicles: Record<string, unknown>[] = [];
  const vehicleIds = new Set<string>();

  for (const vehicle of input.vehicles) {
    if (
      !isObject(vehicle) ||
      typeof vehicle.id !== "string" ||
      !vehicle.id.trim() ||
      typeof vehicle.make !== "string" ||
      !vehicle.make.trim() ||
      typeof vehicle.model !== "string" ||
      !vehicle.model.trim()
    ) {
      throw new Error("В копии есть некорректный автомобиль");
    }
    const id = vehicle.id.trim();
    if (vehicleIds.has(id)) throw new Error("В копии повторяется ID автомобиля");
    vehicleIds.add(id);

    vehicles.push({
      ...cleanRecord(vehicle),
      id,
      make: vehicle.make.trim(),
      model: vehicle.model.trim(),
      year: Number(vehicle.year) || new Date().getFullYear(),
      currentMileage: Math.max(0, Number(vehicle.currentMileage) || 0),
    });
  }

  const result = { vehicles } as unknown as Omit<GarageData, "lastUpdated">;

  for (const key of RECORD_KEYS) {
    const rawRecords = input[key] === undefined ? [] : input[key];
    if (!Array.isArray(rawRecords)) throw new Error("Некорректный список: " + key);

    const ids = new Set<string>();
    const normalizedList: Record<string, unknown>[] = [];

    for (const record of rawRecords) {
      if (
        !isObject(record) ||
        typeof record.id !== "string" ||
        !record.id.trim() ||
        typeof record.vehicleId !== "string" ||
        (!vehicleIds.has(record.vehicleId) && !(key === "garageParts" && record.vehicleId === "all"))
      ) {
        throw new Error("Некорректная запись или ссылка на автомобиль: " + key);
      }

      const id = record.id.trim();
      if (ids.has(id)) throw new Error("В копии повторяется ID записи: " + key);
      ids.add(id);

      const item = cleanRecord(record);
      item.id = id;
      item.vehicleId = record.vehicleId;

      if (key === "serviceRecords") {
        item.title = typeof item.title === "string" ? item.title : "Сервисная запись";
        item.description = typeof item.description === "string" ? item.description : "";
        item.date = typeof item.date === "string" ? item.date : new Date().toISOString().split("T")[0];
        item.mileage = Math.max(0, Number(item.mileage) || 0);
        item.parts = Array.isArray(item.parts)
          ? item.parts.filter(isObject).map((p, idx) => ({
              id: typeof p.id === "string" ? p.id : `part-${id}-${idx}`,
              name: typeof p.name === "string" ? p.name : "",
              brand: typeof p.brand === "string" ? p.brand : "",
              partNumber: typeof p.partNumber === "string" ? p.partNumber : "",
              quantity: Math.max(1, Number(p.quantity) || 1),
              unitPrice: Math.max(0, Number(p.unitPrice) || 0),
            }))
          : [];
        item.receiptImages = Array.isArray(item.receiptImages)
          ? item.receiptImages.filter((img): img is string => typeof img === "string")
          : [];
      } else if (key === "tuningStages") {
        item.tasks = Array.isArray(item.tasks) ? item.tasks.filter(isObject) : [];
      }

      normalizedList.push(item);
    }

    result[key] = normalizedList;
  }

  return result;
}
