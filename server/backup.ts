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

const MAX_BACKUP_VEHICLES = 1_000;
const MAX_BACKUP_RECORDS_PER_COLLECTION = 20_000;

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

function strictNonNegative(value: unknown, max = 1_000_000_000): number | null {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max ? number : null;
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function validateGarageBackup(input: unknown): Omit<GarageData, "lastUpdated"> {
  if (!isObject(input) || !Array.isArray(input.vehicles)) {
    throw new Error("Некорректный формат файла резервной копии");
  }
  if (input.vehicles.length > MAX_BACKUP_VEHICLES) {
    throw new Error("В резервной копии слишком много автомобилей");
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

    const year = vehicle.year === undefined ? new Date().getFullYear() : strictNonNegative(vehicle.year, 2100);
    const currentMileage = vehicle.currentMileage === undefined ? 0 : strictNonNegative(vehicle.currentMileage);
    if (year === null || year < 1886 || !Number.isInteger(year) || currentMileage === null) {
      throw new Error("В копии некорректный год или пробег автомобиля");
    }
    vehicles.push({
      ...cleanRecord(vehicle),
      id,
      make: vehicle.make.trim(),
      model: vehicle.model.trim(),
      year,
      currentMileage,
    });
  }

  const result = { vehicles } as unknown as Omit<GarageData, "lastUpdated">;

  for (const key of RECORD_KEYS) {
    const rawRecords = input[key] === undefined ? [] : input[key];
    if (!Array.isArray(rawRecords)) throw new Error("Некорректный список: " + key);
    if (rawRecords.length > MAX_BACKUP_RECORDS_PER_COLLECTION) {
      throw new Error("В резервной копии слишком много записей: " + key);
    }

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
        if (item.date === undefined) item.date = new Date().toISOString().split("T")[0];
        if (!validDate(item.date)) throw new Error("В копии некорректная дата сервисной записи");
        const mileage = item.mileage === undefined ? 0 : strictNonNegative(item.mileage);
        const laborCost = item.laborCost === undefined ? 0 : strictNonNegative(item.laborCost);
        const totalCost = item.totalCost === undefined ? 0 : strictNonNegative(item.totalCost);
        if (mileage === null || laborCost === null || totalCost === null) throw new Error("В копии некорректные значения сервисной записи");
        item.mileage = mileage;
        item.laborCost = laborCost;
        item.totalCost = totalCost;
        item.parts = Array.isArray(item.parts)
          ? item.parts.filter(isObject).map((p, idx) => {
              const quantity = strictNonNegative(p.quantity, 1_000_000);
              const unitPrice = strictNonNegative(p.unitPrice);
              if (quantity === null || quantity <= 0 || unitPrice === null) throw new Error("В копии некорректная запчасть");
              return {
                id: typeof p.id === "string" ? p.id : `part-${id}-${idx}`,
                name: typeof p.name === "string" ? p.name : "",
                brand: typeof p.brand === "string" ? p.brand : "",
                partNumber: typeof p.partNumber === "string" ? p.partNumber : "",
                quantity,
                unitPrice,
              };
            })
          : [];
        item.receiptImages = Array.isArray(item.receiptImages)
          ? item.receiptImages.filter((img): img is string => typeof img === "string")
          : [];
      } else if (key === "fuelRecords") {
        if (!validDate(item.date)) throw new Error("В копии некорректная дата заправки");
        const liters = strictNonNegative(item.liters, 5_000);
        const pricePerLiter = strictNonNegative(item.pricePerLiter, 100_000);
        const totalCost = strictNonNegative(item.totalCost);
        const mileage = strictNonNegative(item.mileage);
        if (liters === null || liters <= 0 || pricePerLiter === null || totalCost === null || mileage === null) {
          throw new Error("В копии некорректные значения заправки");
        }
        item.liters = liters;
        item.pricePerLiter = pricePerLiter;
        item.totalCost = totalCost;
        item.mileage = mileage;
      } else if (key === "garageParts") {
        const quantity = strictNonNegative(item.quantity, 1_000_000);
        const purchasePrice = strictNonNegative(item.purchasePrice);
        if (quantity === null || quantity <= 0 || purchasePrice === null) throw new Error("В копии некорректная складская деталь");
        item.quantity = quantity;
        item.purchasePrice = purchasePrice;
        if (item.purchaseDate !== undefined && !validDate(item.purchaseDate)) throw new Error("В копии некорректная дата детали");
      } else if (key === "oemSchedules") {
        const intervalKm = strictNonNegative(item.intervalKm, 1_000_000);
        const intervalMonths = strictNonNegative(item.intervalMonths, 240);
        if (intervalKm === null || intervalKm <= 0 || intervalMonths === null || intervalMonths <= 0) throw new Error("В копии некорректный пункт регламента");
        item.intervalKm = intervalKm;
        item.intervalMonths = intervalMonths;
      } else if (key === "toFixTasks") {
        const estimatedCost = strictNonNegative(item.estimatedCost);
        const targetMileage = item.targetMileage === undefined ? undefined : strictNonNegative(item.targetMileage);
        if (estimatedCost === null || (item.targetMileage !== undefined && targetMileage === null)) throw new Error("В копии некорректная задача");
        item.estimatedCost = estimatedCost;
        item.targetMileage = targetMileage;
      } else if (key === "tuningStages") {
        const estimatedBudget = strictNonNegative(item.estimatedBudget);
        const actualCost = strictNonNegative(item.actualCost);
        if (estimatedBudget === null || actualCost === null) throw new Error("В копии некорректный этап тюнинга");
        item.estimatedBudget = estimatedBudget;
        item.actualCost = actualCost;
        item.tasks = Array.isArray(item.tasks) ? item.tasks.filter(isObject) : [];
      }

      normalizedList.push(item);
    }

    result[key] = normalizedList;
  }

  return result;
}
