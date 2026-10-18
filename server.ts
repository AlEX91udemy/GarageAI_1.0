import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

import {
  INITIAL_VEHICLES,
  INITIAL_SERVICE_RECORDS,
  INITIAL_FUEL_RECORDS,
  INITIAL_OEM_SCHEDULES,
  INITIAL_GARAGE_PARTS,
  INITIAL_TO_FIX_TASKS,
  INITIAL_TUNING_STAGES,
} from "./src/mockData";
import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  OemScheduleItem,
  GaragePart,
  ToFixTask,
  TuningStage,
} from "./src/types";
import {
  brands as catalogBrands,
  models as catalogModels,
  generations as catalogGenerations,
  modifications as catalogModifications,
  engines as catalogEngines,
  transmissions as catalogTransmissions,
  bodyTypes as catalogBodyTypes,
  drivetrains as catalogDrivetrains,
  fuelTypes as catalogFuelTypes,
  catalogSources,
  modificationEvidence,
  catalogStats,
  top100 as catalogTop100,
  catalogSearch,
} from "./src/catalog/database";
import { searchKnowledge } from "./src/catalog/knowledge";
import { verifyModification } from "./src/catalog/verification";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON with 25mb limit for receipt photos
app.use(express.json({ limit: "25mb" }));

// Serve static assets from /public directory (e.g. 3D models in /models/*.glb)
const PUBLIC_DIR = path.join(process.cwd(), "public");
app.use(express.static(PUBLIC_DIR));
app.use("/models", express.static(path.join(PUBLIC_DIR, "models")));

// ---------------------------------------------------------------------------
// Database Storage Engine (JSON file persistence with atomic write)
// ---------------------------------------------------------------------------

interface GarageDatabase {
  vehicles: Vehicle[];
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  oemSchedules: OemScheduleItem[];
  garageParts: GaragePart[];
  toFixTasks: ToFixTask[];
  tuningStages: TuningStage[];
  lastUpdated: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = process.env.GARAGE_DB_FILE
  ? path.resolve(process.env.GARAGE_DB_FILE)
  : path.join(DATA_DIR, "garage_store.json");
const VALID_BODY_TYPES = new Set<NonNullable<Vehicle["bodyType"]>>([
  "suv", "sedan", "hatchback", "coupe", "wagon", "convertible", "minivan", "pickup", "van", "minibus", "liftback", "crossover-coupe",
]);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueId(preferred: unknown, prefix: string, existing: { id: string }[]): string {
  const candidate = typeof preferred === "string" && preferred.trim() ? preferred.trim() : `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  return existing.some((item) => item.id === candidate) ? `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}` : candidate;
}

function getInitialDatabase(): GarageDatabase {
  return {
    vehicles: clone(INITIAL_VEHICLES),
    serviceRecords: clone(INITIAL_SERVICE_RECORDS),
    fuelRecords: clone(INITIAL_FUEL_RECORDS),
    oemSchedules: clone(INITIAL_OEM_SCHEDULES),
    garageParts: clone(INITIAL_GARAGE_PARTS),
    toFixTasks: clone(INITIAL_TO_FIX_TASKS),
    tuningStages: clone(INITIAL_TUNING_STAGES),
    lastUpdated: new Date().toISOString(),
  };
}

function ensureDatabaseExists(): GarageDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }

    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : INITIAL_VEHICLES,
      serviceRecords: Array.isArray(parsed.serviceRecords) ? parsed.serviceRecords : INITIAL_SERVICE_RECORDS,
      fuelRecords: Array.isArray(parsed.fuelRecords) ? parsed.fuelRecords : INITIAL_FUEL_RECORDS,
      oemSchedules: Array.isArray(parsed.oemSchedules) ? parsed.oemSchedules : INITIAL_OEM_SCHEDULES,
      garageParts: Array.isArray(parsed.garageParts) ? parsed.garageParts : INITIAL_GARAGE_PARTS,
      toFixTasks: Array.isArray(parsed.toFixTasks) ? parsed.toFixTasks : INITIAL_TO_FIX_TASKS,
      tuningStages: Array.isArray(parsed.tuningStages) ? parsed.tuningStages : INITIAL_TUNING_STAGES,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database initialization failed, fallback to defaults:", error);
    return getInitialDatabase();
  }
}

// In-memory cache synced to disk
let dbMemory: GarageDatabase = ensureDatabaseExists();

function saveDatabase(): void {
  try {
    dbMemory.lastUpdated = new Date().toISOString();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(dbMemory, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("Error writing database to disk:", err);
  }
}

// ---------------------------------------------------------------------------
// Google GenAI Lazy Initialization
// ---------------------------------------------------------------------------

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "garagehub-applet",
        },
      },
    });
  }
  return aiClient;
}

function parseJsonSafely<T = any>(text: string | undefined | null, fallback: T): T {
  if (!text) return fallback;
  try {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    try {
      const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {}
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// REST API Routes
// ---------------------------------------------------------------------------

// 1. Health and Meta Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    vehiclesCount: dbMemory.vehicles.length,
    serviceRecordsCount: dbMemory.serviceRecords.length,
    fuelRecordsCount: dbMemory.fuelRecords.length,
    partsCount: dbMemory.garageParts.length,
    toFixCount: dbMemory.toFixTasks.length,
    lastUpdated: dbMemory.lastUpdated,
    timestamp: new Date().toISOString(),
  });
});

// 2. Complete State Sync
app.get("/api/data", (_req, res) => {
  res.json({
    vehicles: dbMemory.vehicles,
    serviceRecords: dbMemory.serviceRecords,
    fuelRecords: dbMemory.fuelRecords,
    oemSchedules: dbMemory.oemSchedules,
    garageParts: dbMemory.garageParts,
    toFixTasks: dbMemory.toFixTasks,
    tuningStages: dbMemory.tuningStages,
    lastUpdated: dbMemory.lastUpdated,
  });
});

// ---------------------------------------------------------------------------
// Vehicles API
// ---------------------------------------------------------------------------

app.get("/api/vehicles", (_req, res) => {
  res.json(dbMemory.vehicles);
});

// Normalized vehicle catalog API. These routes intentionally precede /:id.
app.get("/api/vehicles/brands", (_req, res) => res.json(catalogBrands));
app.get("/api/vehicles/brands/:brandId/models", (req, res) => {
  const brand = catalogBrands.find((item) => item.id === req.params.brandId);
  if (!brand) return res.status(404).json({ error: "Марка не найдена" });
  res.json(catalogModels.filter((item) => item.brandId === brand.id));
});
app.get("/api/vehicles/models/:modelId/generations", (req, res) => {
  const model = catalogModels.find((item) => item.id === req.params.modelId);
  if (!model) return res.status(404).json({ error: "Модель не найдена" });
  res.json(catalogGenerations.filter((item) => item.modelId === model.id));
});
app.get("/api/vehicles/generations/:generationId/modifications", (req, res) => {
  const generation = catalogGenerations.find((item) => item.id === req.params.generationId);
  if (!generation) return res.status(404).json({ error: "Поколение не найдено" });
  res.json(catalogModifications.filter((item) => item.generationId === generation.id));
});
app.get("/api/vehicles/search", (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  res.json(catalogSearch(query));
});
app.get("/api/vehicles/top100", (_req, res) => {
  const items = catalogTop100.map((modification, index) => {
    const generation = catalogGenerations.find((item) => item.id === modification.generationId);
    const model = generation && catalogModels.find((item) => item.id === generation.modelId);
    const brand = model && catalogBrands.find((item) => item.id === model.brandId);
    return { rank: index + 1, verified: false, brand, model, generation, modification };
  });
  res.json({ items, provisional: true, note: "Требует подтверждения статистикой рынка РФ и официальными спецификациями", sourceIds: catalogSources.map((source) => source.id) });
});
app.get("/api/catalog/meta", (_req, res) => res.json({ ...catalogStats, sources: catalogSources, bodyTypes: catalogBodyTypes, drivetrains: catalogDrivetrains, fuelTypes: catalogFuelTypes, engines: catalogEngines, transmissions: catalogTransmissions }));
app.get("/api/catalog/modifications/:id", (req, res) => {
  const modification = catalogModifications.find((item) => item.id === req.params.id);
  if (!modification) return res.status(404).json({ error: "Модификация не найдена" });
  const generation = catalogGenerations.find((item) => item.id === modification.generationId);
  const model = generation && catalogModels.find((item) => item.id === generation.modelId);
  const brand = model && catalogBrands.find((item) => item.id === model.brandId);
  res.json({ modification, generation, model, brand, engine: catalogEngines.find((item) => item.id === modification.engineId) || null, transmission: catalogTransmissions.find((item) => item.id === modification.transmissionId) || null, source: catalogSources.find((item) => item.id === modification.sourceId) || null, evidence: modificationEvidence.filter((item) => item.modificationId === modification.id), verification: verifyModification(modification, modificationEvidence, catalogSources) });
});
app.get("/api/knowledge/search", (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  const filters = { brand: typeof req.query.brand === "string" ? req.query.brand : undefined, model: typeof req.query.model === "string" ? req.query.model : undefined, generation: typeof req.query.generation === "string" ? req.query.generation : undefined, category: typeof req.query.category === "string" ? req.query.category : undefined };
  res.json({ chunks: searchKnowledge(query, filters as any), sources: catalogSources });
});

app.get("/api/vehicles/:id", (req, res) => {
  const vehicle = dbMemory.vehicles.find((v) => v.id === req.params.id);
  if (!vehicle) {
    return res.status(404).json({ error: "Автомобиль не найден" });
  }
  res.json(vehicle);
});

app.post("/api/vehicles", (req, res) => {
  const body = req.body as Partial<Vehicle>;
  if (typeof body.make !== "string" || !body.make.trim() || typeof body.model !== "string" || !body.model.trim()) {
    return res.status(400).json({ error: "Марка и модель обязательны для заполнения" });
  }
  if (body.bodyType !== undefined && !VALID_BODY_TYPES.has(body.bodyType)) {
    return res.status(400).json({ error: "Некорректный тип кузова" });
  }

  const colorHex =
    typeof body.colorHex === "string" && /^#[0-9a-f]{6}$/i.test(body.colorHex)
      ? body.colorHex
      : "#2563eb";
  const newVehicle: Vehicle = {
    id: uniqueId(body.id, "car", dbMemory.vehicles),
    make: body.make.trim(),
    model: body.model.trim(),
    generation: body.generation?.trim() || "",
    year: Number(body.year) || new Date().getFullYear(),
    licensePlate: body.licensePlate?.trim() || "",
    vin: body.vin?.trim() || "",
    engine: body.engine?.trim() || "Стандарт",
    fuelType: body.fuelType || "Бензин (АИ-95)",
    transmission: body.transmission || "Автомат",
    driveType: body.driveType || "Передний",
    currentMileage: Number(body.currentMileage) || 0,
    lastMileageUpdate: new Date().toLocaleDateString("ru-RU"),
    colorHex,
    bodyType: body.bodyType || "sedan",
    photoUrl: body.photoUrl,
  };

  dbMemory.vehicles.push(newVehicle);
  saveDatabase();
  res.status(201).json(newVehicle);
});

app.put("/api/vehicles/:id", (req, res) => {
  const index = dbMemory.vehicles.findIndex((v) => v.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Автомобиль не найден" });
  }

  const existing = dbMemory.vehicles[index];
  const body = (req.body || {}) as Record<string, unknown>;
  if (body.make !== undefined && (typeof body.make !== "string" || !body.make.trim())) {
    return res.status(400).json({ error: "Марка не может быть пустой" });
  }
  if (body.model !== undefined && (typeof body.model !== "string" || !body.model.trim())) {
    return res.status(400).json({ error: "Модель не может быть пустой" });
  }
  if (body.bodyType !== undefined && (typeof body.bodyType !== "string" || !VALID_BODY_TYPES.has(body.bodyType as any))) {
    return res.status(400).json({ error: "Некорректный тип кузова" });
  }
  if (
    body.colorHex !== undefined &&
    (typeof body.colorHex !== "string" || !/^#[0-9a-f]{6}$/i.test(body.colorHex))
  ) {
    return res.status(400).json({ error: "Некорректный цвет кузова" });
  }
  if (body.currentMileage !== undefined && (!Number.isFinite(Number(body.currentMileage)) || Number(body.currentMileage) < 0)) {
    return res.status(400).json({ error: "Некорректное значение пробега" });
  }
  if (body.year !== undefined && (!Number.isFinite(Number(body.year)) || Number(body.year) < 1900 || Number(body.year) > 2100)) {
    return res.status(400).json({ error: "Некорректный год выпуска" });
  }

  dbMemory.vehicles[index] = {
    ...existing,
    id: req.params.id,
    make: typeof body.make === "string" ? body.make.trim() : existing.make,
    model: typeof body.model === "string" ? body.model.trim() : existing.model,
    generation: typeof body.generation === "string" ? body.generation.trim() : existing.generation,
    year: body.year !== undefined ? Number(body.year) : existing.year,
    licensePlate: typeof body.licensePlate === "string" ? body.licensePlate.trim() : existing.licensePlate,
    vin: typeof body.vin === "string" ? body.vin.trim() : existing.vin,
    engine: typeof body.engine === "string" ? body.engine.trim() : existing.engine,
    fuelType: typeof body.fuelType === "string" ? body.fuelType.trim() : existing.fuelType,
    transmission: typeof body.transmission === "string" ? body.transmission.trim() : existing.transmission,
    driveType: typeof body.driveType === "string" ? body.driveType.trim() : existing.driveType,
    currentMileage: body.currentMileage !== undefined ? Number(body.currentMileage) : existing.currentMileage,
    lastMileageUpdate: typeof body.lastMileageUpdate === "string" ? body.lastMileageUpdate : existing.lastMileageUpdate,
    colorHex: typeof body.colorHex === "string" ? body.colorHex : existing.colorHex,
    bodyType: typeof body.bodyType === "string" ? (body.bodyType as Vehicle["bodyType"]) : existing.bodyType,
    photoUrl: body.photoUrl === undefined ? existing.photoUrl : typeof body.photoUrl === "string" ? body.photoUrl : undefined,
    model3dUrl: body.model3dUrl === undefined ? existing.model3dUrl : typeof body.model3dUrl === "string" ? body.model3dUrl : undefined,
  };

  saveDatabase();
  res.json(dbMemory.vehicles[index]);
});

app.patch("/api/vehicles/:id/mileage", (req, res) => {
  const { mileage } = req.body;
  const numMileage = Number(mileage);
  if (isNaN(numMileage) || numMileage < 0) {
    return res.status(400).json({ error: "Некорректное значение пробега" });
  }

  const vehicle = dbMemory.vehicles.find((v) => v.id === req.params.id);
  if (!vehicle) {
    return res.status(404).json({ error: "Автомобиль не найден" });
  }

  vehicle.currentMileage = numMileage;
  vehicle.lastMileageUpdate = new Date().toLocaleDateString("ru-RU");
  saveDatabase();
  res.json(vehicle);
});

app.delete("/api/vehicles/:id", (req, res) => {
  const id = req.params.id;
  const initialCount = dbMemory.vehicles.length;
  dbMemory.vehicles = dbMemory.vehicles.filter((v) => v.id !== id);

  if (dbMemory.vehicles.length === initialCount) {
    return res.status(404).json({ error: "Автомобиль не найден" });
  }

  // Also clean up linked records
  dbMemory.serviceRecords = dbMemory.serviceRecords.filter((r) => r.vehicleId !== id);
  dbMemory.fuelRecords = dbMemory.fuelRecords.filter((r) => r.vehicleId !== id);
  dbMemory.oemSchedules = dbMemory.oemSchedules.filter((s) => s.vehicleId !== id);
  dbMemory.garageParts = dbMemory.garageParts.filter((p) => p.vehicleId !== id);
  dbMemory.toFixTasks = dbMemory.toFixTasks.filter((t) => t.vehicleId !== id);
  dbMemory.tuningStages = dbMemory.tuningStages.filter((t) => t.vehicleId !== id);

  saveDatabase();
  res.json({ success: true, message: "Автомобиль и связанные записи удалены" });
});

// ---------------------------------------------------------------------------
// Service Records API
// ---------------------------------------------------------------------------

app.get("/api/services", (req, res) => {
  const { vehicleId, category, search } = req.query;
  let list = dbMemory.serviceRecords;

  if (vehicleId && typeof vehicleId === "string") {
    list = list.filter((r) => r.vehicleId === vehicleId);
  }
  if (category && typeof category === "string") {
    list = list.filter((r) => r.category === category);
  }
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    list = list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.parts.some(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.partNumber.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q)
        )
    );
  }

  // Sort descending by date
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(list);
});

app.post("/api/services", (req, res) => {
  const body = req.body as Partial<ServiceRecord> & {
    completedTaskId?: string;
    installedPartIds?: string[];
  };

  if (typeof body.vehicleId !== "string" || !body.vehicleId.trim() || typeof body.title !== "string" || !body.title.trim() || typeof body.date !== "string" || !body.date.trim()) {
    return res.status(400).json({ error: "vehicleId, title и date обязательны" });
  }
  if (!dbMemory.vehicles.some((vehicle) => vehicle.id === body.vehicleId)) {
    return res.status(404).json({ error: "Автомобиль не найден" });
  }

  const parts = Array.isArray(body.parts) ? body.parts : [];
  const partsCost = parts.reduce((sum, p) => sum + (p.quantity || 1) * (p.unitPrice || 0), 0);
  const laborCost = Number(body.laborCost) || 0;
  const totalCost = body.totalCost !== undefined ? Number(body.totalCost) : laborCost + partsCost;

  const newRecord: ServiceRecord = {
    id: body.id || `rec-${Date.now()}`,
    vehicleId: body.vehicleId,
    date: body.date,
    mileage: Number(body.mileage) || 0,
    category: body.category || "ТО и замена жидкостей",
    title: body.title.trim(),
    description: body.description?.trim() || "",
    laborCost,
    parts,
    totalCost,
    serviceCenter: body.serviceCenter?.trim() || "",
    receiptImages: body.receiptImages || [],
    notes: body.notes?.trim() || "",
  };

  dbMemory.serviceRecords.unshift(newRecord);

  // Auto-update car mileage if record mileage is higher
  const car = dbMemory.vehicles.find((v) => v.id === newRecord.vehicleId);
  if (car && newRecord.mileage > car.currentMileage) {
    car.currentMileage = newRecord.mileage;
    car.lastMileageUpdate = new Date().toLocaleDateString("ru-RU");
  }

  // Mark task completed if linked
  if (body.completedTaskId) {
    const task = dbMemory.toFixTasks.find((t) => t.id === body.completedTaskId);
    if (task) task.status = "completed";
  }

  // Mark garage parts installed if part numbers or explicit IDs match
  const installedIds = new Set(Array.isArray(body.installedPartIds) ? body.installedPartIds : []);
  const partNumbers = parts
    .map((p) => (typeof p?.partNumber === "string" ? p.partNumber.trim().toLowerCase() : ""))
    .filter(Boolean);
  if (partNumbers.length > 0 || installedIds.size > 0) {
    dbMemory.garageParts.forEach((gp) => {
      const gpSku = typeof gp.partNumber === "string" ? gp.partNumber.trim().toLowerCase() : "";
      if (
        installedIds.has(gp.id) ||
        ((gp.vehicleId === newRecord.vehicleId || gp.vehicleId === "all") &&
          gpSku.length > 0 &&
          partNumbers.includes(gpSku))
      ) {
        gp.status = "installed";
      }
    });
  }

  saveDatabase();
  res.status(201).json(newRecord);
});

app.put("/api/services/:id", (req, res) => {
  const index = dbMemory.serviceRecords.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Запись сервиса не найдена" });
  }

  const existing = dbMemory.serviceRecords[index];
  const body = (req.body || {}) as Record<string, unknown>;
  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) {
    return res.status(400).json({ error: "Название работ не может быть пустым" });
  }
  if (body.parts !== undefined && !Array.isArray(body.parts)) {
    return res.status(400).json({ error: "Поле parts должно быть массивом" });
  }
  if (body.mileage !== undefined && (!Number.isFinite(Number(body.mileage)) || Number(body.mileage) < 0)) {
    return res.status(400).json({ error: "Некорректный пробег" });
  }

  const sanitizedParts = Array.isArray(body.parts)
    ? body.parts
        .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === "object"))
        .map((p, idx) => ({
          id: typeof p.id === "string" && p.id ? p.id : `p-${Date.now()}-${idx}`,
          name: typeof p.name === "string" ? p.name.trim() : "",
          brand: typeof p.brand === "string" ? p.brand.trim() : "",
          partNumber: typeof p.partNumber === "string" ? p.partNumber.trim() : "",
          quantity: Number.isFinite(Number(p.quantity)) && Number(p.quantity) > 0 ? Number(p.quantity) : 1,
          unitPrice: Number.isFinite(Number(p.unitPrice)) && Number(p.unitPrice) >= 0 ? Number(p.unitPrice) : 0,
        }))
    : existing.parts;

  const laborCost =
    body.laborCost !== undefined && Number.isFinite(Number(body.laborCost))
      ? Number(body.laborCost)
      : existing.laborCost;
  const partsCost = sanitizedParts.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  const totalCost =
    body.totalCost !== undefined && Number.isFinite(Number(body.totalCost))
      ? Number(body.totalCost)
      : laborCost + partsCost;

  dbMemory.serviceRecords[index] = {
    ...existing,
    id: req.params.id,
    vehicleId: typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId.trim() : existing.vehicleId,
    date: typeof body.date === "string" && body.date.trim() ? body.date.trim() : existing.date,
    mileage: body.mileage !== undefined ? Number(body.mileage) : existing.mileage,
    category: (typeof body.category === "string" && body.category.trim() ? body.category.trim() : existing.category) as ServiceRecord["category"],
    title: typeof body.title === "string" ? body.title.trim() : existing.title,
    description: typeof body.description === "string" ? body.description.trim() : existing.description,
    laborCost,
    parts: sanitizedParts,
    totalCost,
    serviceCenter: typeof body.serviceCenter === "string" ? body.serviceCenter.trim() : existing.serviceCenter,
    receiptImages: Array.isArray(body.receiptImages)
      ? body.receiptImages.filter((img): img is string => typeof img === "string")
      : existing.receiptImages,
    notes: typeof body.notes === "string" ? body.notes.trim() : existing.notes,
  };

  saveDatabase();
  res.json(dbMemory.serviceRecords[index]);
});

app.delete("/api/services/:id", (req, res) => {
  const id = req.params.id;
  const initialLen = dbMemory.serviceRecords.length;
  dbMemory.serviceRecords = dbMemory.serviceRecords.filter((r) => r.id !== id);

  if (dbMemory.serviceRecords.length === initialLen) {
    return res.status(404).json({ error: "Запись сервиса не найдена" });
  }

  saveDatabase();
  res.json({ success: true, message: "Запись сервиса удалена" });
});

// ---------------------------------------------------------------------------
// Fuel Records API
// ---------------------------------------------------------------------------

app.get("/api/fuel", (req, res) => {
  const { vehicleId } = req.query;
  let list = dbMemory.fuelRecords;
  if (vehicleId && typeof vehicleId === "string") {
    list = list.filter((f) => f.vehicleId === vehicleId);
  }
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(list);
});

app.post("/api/fuel", (req, res) => {
  const body = req.body as Partial<FuelRecord>;
  if (typeof body.vehicleId !== "string" || !body.vehicleId.trim() || typeof body.date !== "string" || !body.date.trim()) {
    return res.status(400).json({ error: "vehicleId, date и liters обязательны" });
  }

  const liters = Number(body.liters) || 0;
  if (liters <= 0 || !Number.isFinite(liters)) {
    return res.status(400).json({ error: "Объём топлива должен быть больше нуля" });
  }
  if (!dbMemory.vehicles.some((vehicle) => vehicle.id === body.vehicleId)) {
    return res.status(404).json({ error: "Автомобиль не найден" });
  }
  const pricePerLiter = Number(body.pricePerLiter) || 0;
  const totalCost = body.totalCost ? Number(body.totalCost) : Math.round(liters * pricePerLiter);
  const mileage = Number(body.mileage) || 0;

  // Calculate fuel consumption if there's a previous full tank record
  let calculatedConsumption: number | undefined = undefined;
  if (body.isFullTank && mileage > 0) {
    const prevRecords = dbMemory.fuelRecords
      .filter((f) => f.vehicleId === body.vehicleId && f.mileage < mileage && f.isFullTank)
      .sort((a, b) => b.mileage - a.mileage);

    if (prevRecords.length > 0) {
      const distance = mileage - prevRecords[0].mileage;
      if (distance > 0 && distance < 2000) {
        calculatedConsumption = Number(((liters / distance) * 100).toFixed(1));
      }
    }
  }

  const newFuel: FuelRecord = {
    id: body.id || `fuel-${Date.now()}`,
    vehicleId: body.vehicleId,
    date: body.date,
    mileage,
    liters,
    pricePerLiter,
    totalCost,
    fuelType: body.fuelType || "АИ-95",
    isFullTank: Boolean(body.isFullTank),
    station: body.station?.trim() || "",
    calculatedConsumption,
  };

  dbMemory.fuelRecords.unshift(newFuel);

  // Update vehicle mileage if higher
  const car = dbMemory.vehicles.find((v) => v.id === newFuel.vehicleId);
  if (car && newFuel.mileage > car.currentMileage) {
    car.currentMileage = newFuel.mileage;
    car.lastMileageUpdate = new Date().toLocaleDateString("ru-RU");
  }

  saveDatabase();
  res.status(201).json(newFuel);
});

app.delete("/api/fuel/:id", (req, res) => {
  const id = req.params.id;
  const len = dbMemory.fuelRecords.length;
  dbMemory.fuelRecords = dbMemory.fuelRecords.filter((f) => f.id !== id);

  if (dbMemory.fuelRecords.length === len) {
    return res.status(404).json({ error: "Запись заправки не найдена" });
  }

  saveDatabase();
  res.json({ success: true, message: "Запись заправки удалена" });
});

// ---------------------------------------------------------------------------
// Spare Parts Warehouse / Inventory API
// ---------------------------------------------------------------------------

app.get("/api/inventory", (req, res) => {
  const { vehicleId, status } = req.query;
  let list = dbMemory.garageParts;

  if (vehicleId && typeof vehicleId === "string") {
    list = list.filter((p) => p.vehicleId === vehicleId || p.vehicleId === "all");
  }
  if (status && typeof status === "string") {
    list = list.filter((p) => p.status === status);
  }

  res.json(list);
});

app.post("/api/inventory", (req, res) => {
  const body = req.body as Partial<GaragePart>;
  if (typeof body.name !== "string" || !body.name.trim()) {
    return res.status(400).json({ error: "Название детали обязательно" });
  }

  const partNumber =
    typeof body.partNumber === "string" && body.partNumber.trim()
      ? body.partNumber.trim().toUpperCase()
      : `SKU-${Date.now().toString().slice(-6)}`;

  const newPart: GaragePart = {
    id: body.id || `gp-${Date.now()}`,
    vehicleId: body.vehicleId || "all",
    name: body.name.trim(),
    brand: body.brand?.trim() || "OEM",
    partNumber,
    quantity: Number(body.quantity) || 1,
    purchasePrice: Number(body.purchasePrice) || 0,
    purchaseDate: body.purchaseDate || new Date().toISOString().split("T")[0],
    location: body.location?.trim() || "Стеллаж в гараже",
    status: body.status || "in_stock",
    category: body.category || "ТО и замена жидкостей",
  };

  dbMemory.garageParts.unshift(newPart);
  saveDatabase();
  res.status(201).json(newPart);
});

app.put("/api/inventory/:id", (req, res) => {
  const index = dbMemory.garageParts.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Деталь не найдена" });
  }

  const existing = dbMemory.garageParts[index];
  const body = (req.body || {}) as Record<string, unknown>;
  if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
    return res.status(400).json({ error: "Название детали не может быть пустым" });
  }
  if (body.status !== undefined && body.status !== "in_stock" && body.status !== "installed" && body.status !== "ordered") {
    return res.status(400).json({ error: "Некорректный статус детали" });
  }

  dbMemory.garageParts[index] = {
    ...existing,
    id: req.params.id,
    vehicleId: typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId.trim() : existing.vehicleId,
    name: typeof body.name === "string" ? body.name.trim() : existing.name,
    brand: typeof body.brand === "string" ? body.brand.trim() : existing.brand,
    partNumber: typeof body.partNumber === "string" ? body.partNumber.trim() : existing.partNumber,
    quantity: body.quantity !== undefined && Number.isFinite(Number(body.quantity)) && Number(body.quantity) > 0 ? Number(body.quantity) : existing.quantity,
    purchasePrice: body.purchasePrice !== undefined && Number.isFinite(Number(body.purchasePrice)) && Number(body.purchasePrice) >= 0 ? Number(body.purchasePrice) : existing.purchasePrice,
    purchaseDate: typeof body.purchaseDate === "string" ? body.purchaseDate : existing.purchaseDate,
    location: typeof body.location === "string" ? body.location.trim() : existing.location,
    status: (body.status as GaragePart["status"]) || existing.status,
    category: (typeof body.category === "string" ? body.category : existing.category) as GaragePart["category"],
  };

  saveDatabase();
  res.json(dbMemory.garageParts[index]);
});

app.post("/api/inventory/:id/install", (req, res) => {
  const part = dbMemory.garageParts.find((p) => p.id === req.params.id);
  if (!part) {
    return res.status(404).json({ error: "Деталь не найдена" });
  }

  part.status = "installed";
  saveDatabase();
  res.json({ success: true, part });
});

app.delete("/api/inventory/:id", (req, res) => {
  const id = req.params.id;
  const len = dbMemory.garageParts.length;
  dbMemory.garageParts = dbMemory.garageParts.filter((p) => p.id !== id);

  if (dbMemory.garageParts.length === len) {
    return res.status(404).json({ error: "Деталь не найдена" });
  }

  saveDatabase();
  res.json({ success: true, message: "Деталь удалена со склада" });
});

// ---------------------------------------------------------------------------
// Parts Catalog & Garage Availability Check API
// ---------------------------------------------------------------------------

app.post("/api/parts/check-availability", (req, res) => {
  const { code, partNumber, brand } = req.body;
  const rawKey = String(partNumber || code || "").trim();
  const searchKey = rawKey.toUpperCase().replace(/[\s-_]/g, "");

  // 1. Search in Garage Inventory
  const foundInGarage = dbMemory.garageParts.find((gp) => {
    const gpKey = gp.partNumber.toUpperCase().replace(/[\s-_]/g, "");
    return (
      (searchKey.length >= 3 && (gpKey.includes(searchKey) || searchKey.includes(gpKey))) ||
      gp.partNumber.toUpperCase() === rawKey.toUpperCase()
    );
  });

  // 2. Base price calculation
  let basePrice = 1800;
  let partName = "Автозапчасть";
  let brandName = brand || "OEM";
  let skuName = partNumber || code || "SKU-AUTO";

  if (foundInGarage) {
    basePrice = foundInGarage.purchasePrice || 1800;
    partName = foundInGarage.name;
    brandName = foundInGarage.brand;
    skuName = foundInGarage.partNumber;
  }

  const minPrice = Math.round(basePrice * 0.92);
  const maxPrice = Math.round(basePrice * 1.18);

  const suppliers = [
    {
      supplierName: "Центральный склад (Москва)",
      price: minPrice,
      inStock: 18,
      deliveryDays: 1,
      rating: 4.9,
    },
    {
      supplierName: "Autodoc (Партнер)",
      price: basePrice,
      inStock: 7,
      deliveryDays: 1,
      rating: 4.8,
    },
    {
      supplierName: "Exist.ru Регион",
      price: Math.round(basePrice * 1.05),
      inStock: 12,
      deliveryDays: 2,
      rating: 4.7,
    },
    {
      supplierName: "Emex Опт",
      price: Math.round(basePrice * 0.95),
      inStock: 4,
      deliveryDays: 3,
      rating: 4.6,
    },
  ];

  const totalStock = suppliers.reduce((sum, s) => sum + s.inStock, 0);

  res.json({
    searchedCode: code || partNumber,
    sku: skuName,
    name: partName,
    brand: brandName,
    inGarage: Boolean(foundInGarage),
    garageItem: foundInGarage
      ? {
          id: foundInGarage.id,
          quantity: foundInGarage.quantity,
          location: foundInGarage.location,
          status: foundInGarage.status,
          purchasePrice: foundInGarage.purchasePrice,
          purchaseDate: foundInGarage.purchaseDate,
        }
      : null,
    marketPrice: basePrice,
    marketPriceRange: { min: minPrice, max: maxPrice },
    totalSuppliersStock: totalStock,
    fastestDeliveryDays: 1,
    suppliers,
    lastCheckedTime: new Date().toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  });
});

// ---------------------------------------------------------------------------
// To-Fix Checklist API
// ---------------------------------------------------------------------------

app.get("/api/to-fix", (req, res) => {
  const { vehicleId, status } = req.query;
  let list = dbMemory.toFixTasks;

  if (vehicleId && typeof vehicleId === "string") {
    list = list.filter((t) => t.vehicleId === vehicleId);
  }
  if (status && typeof status === "string") {
    list = list.filter((t) => t.status === status);
  }

  res.json(list);
});

app.post("/api/to-fix", (req, res) => {
  const body = req.body as Partial<ToFixTask>;
  if (typeof body.vehicleId !== "string" || !body.vehicleId.trim() || typeof body.title !== "string" || !body.title.trim()) {
    return res.status(400).json({ error: "vehicleId и title задачи обязательны" });
  }
  if (!dbMemory.vehicles.some((vehicle) => vehicle.id === body.vehicleId)) {
    return res.status(404).json({ error: "Автомобиль не найден" });
  }

  const newTask: ToFixTask = {
    id: body.id || `tf-${Date.now()}`,
    vehicleId: body.vehicleId,
    title: body.title.trim(),
    priority: body.priority || "medium",
    estimatedCost: Number(body.estimatedCost) || 0,
    targetMileage: body.targetMileage ? Number(body.targetMileage) : undefined,
    category: body.category || "ТО и замена жидкостей",
    description: body.description?.trim() || "",
    linkedPartSku: body.linkedPartSku?.trim() || "",
    dueDate: body.dueDate || "",
    createdAt: new Date().toISOString(),
    status: body.status || "pending",
  };

  dbMemory.toFixTasks.unshift(newTask);
  saveDatabase();
  res.status(201).json(newTask);
});

app.put("/api/to-fix/:id", (req, res) => {
  const index = dbMemory.toFixTasks.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Задача не найдена" });
  }

  const existing = dbMemory.toFixTasks[index];
  const body = (req.body || {}) as Record<string, unknown>;
  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) {
    return res.status(400).json({ error: "Название задачи не может быть пустым" });
  }
  if (body.status !== undefined && body.status !== "pending" && body.status !== "in_progress" && body.status !== "completed") {
    return res.status(400).json({ error: "Некорректный статус задачи" });
  }
  if (body.priority !== undefined && body.priority !== "high" && body.priority !== "medium" && body.priority !== "low") {
    return res.status(400).json({ error: "Некорректный приоритет задачи" });
  }

  dbMemory.toFixTasks[index] = {
    ...existing,
    id: req.params.id,
    vehicleId: typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId.trim() : existing.vehicleId,
    title: typeof body.title === "string" ? body.title.trim() : existing.title,
    priority: (body.priority as ToFixTask["priority"]) || existing.priority,
    estimatedCost: body.estimatedCost !== undefined && Number.isFinite(Number(body.estimatedCost)) ? Number(body.estimatedCost) : existing.estimatedCost,
    targetMileage: body.targetMileage !== undefined && Number.isFinite(Number(body.targetMileage)) ? Number(body.targetMileage) : existing.targetMileage,
    category: (typeof body.category === "string" ? body.category : existing.category) as ToFixTask["category"],
    description: typeof body.description === "string" ? body.description.trim() : existing.description,
    linkedPartSku: typeof body.linkedPartSku === "string" ? body.linkedPartSku.trim() : existing.linkedPartSku,
    dueDate: typeof body.dueDate === "string" ? body.dueDate : existing.dueDate,
    status: (body.status as ToFixTask["status"]) || existing.status,
    workHint: typeof body.workHint === "string" ? body.workHint.trim() : existing.workHint,
  };

  saveDatabase();
  res.json(dbMemory.toFixTasks[index]);
});

app.post("/api/to-fix/:id/complete", (req, res) => {
  const task = dbMemory.toFixTasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Задача не найдена" });
  }

  task.status = "completed";
  saveDatabase();
  res.json({ success: true, task });
});

app.delete("/api/to-fix/:id", (req, res) => {
  const id = req.params.id;
  const len = dbMemory.toFixTasks.length;
  dbMemory.toFixTasks = dbMemory.toFixTasks.filter((t) => t.id !== id);

  if (dbMemory.toFixTasks.length === len) {
    return res.status(404).json({ error: "Задача не найдена" });
  }

  saveDatabase();
  res.json({ success: true, message: "Задача удалена" });
});

// ---------------------------------------------------------------------------
// OEM Schedule API
// ---------------------------------------------------------------------------

app.get("/api/oem-schedule", (req, res) => {
  const { vehicleId } = req.query;
  let list = dbMemory.oemSchedules;
  if (vehicleId && typeof vehicleId === "string") {
    list = list.filter((s) => s.vehicleId === vehicleId);
  }
  res.json(list);
});

app.post("/api/oem-schedule", (req, res) => {
  const { vehicleId, items } = req.body;
  if (!vehicleId || !Array.isArray(items)) {
    return res.status(400).json({ error: "vehicleId и items обязательны" });
  }

  // Remove existing or merge
  dbMemory.oemSchedules = dbMemory.oemSchedules.filter((s) => s.vehicleId !== vehicleId);
  const formatted: OemScheduleItem[] = items.map((item: any) => ({
    id: item.id || `oem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    vehicleId,
    title: item.title,
    category: item.category || "ТО и замена жидкостей",
    intervalKm: Number(item.intervalKm) || 10000,
    intervalMonths: Number(item.intervalMonths) || 12,
    lastDoneKm: item.lastDoneKm ? Number(item.lastDoneKm) : undefined,
    lastDoneDate: item.lastDoneDate || undefined,
    description: item.description || "",
    oemPartHint: item.oemPartHint || "",
    notes: item.notes || "",
  }));

  dbMemory.oemSchedules.push(...formatted);
  saveDatabase();
  res.status(201).json(formatted);
});

app.put("/api/oem-schedule/:id", (req, res) => {
  const index = dbMemory.oemSchedules.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Пункт регламента не найден" });
  }

  const existing = dbMemory.oemSchedules[index];
  const body = (req.body || {}) as Record<string, unknown>;
  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) {
    return res.status(400).json({ error: "Название пункта регламента не может быть пустым" });
  }
  if (body.intervalKm !== undefined && (!Number.isFinite(Number(body.intervalKm)) || Number(body.intervalKm) <= 0)) {
    return res.status(400).json({ error: "Некорректный интервал пробега" });
  }

  dbMemory.oemSchedules[index] = {
    ...existing,
    id: req.params.id,
    vehicleId: typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId.trim() : existing.vehicleId,
    title: typeof body.title === "string" ? body.title.trim() : existing.title,
    category: typeof body.category === "string" ? body.category.trim() : existing.category,
    intervalKm: body.intervalKm !== undefined ? Number(body.intervalKm) : existing.intervalKm,
    intervalMonths: body.intervalMonths !== undefined && Number.isFinite(Number(body.intervalMonths)) && Number(body.intervalMonths) > 0 ? Number(body.intervalMonths) : existing.intervalMonths,
    lastDoneKm: body.lastDoneKm !== undefined && Number.isFinite(Number(body.lastDoneKm)) ? Number(body.lastDoneKm) : existing.lastDoneKm,
    lastDoneDate: typeof body.lastDoneDate === "string" ? body.lastDoneDate : existing.lastDoneDate,
    description: typeof body.description === "string" ? body.description.trim() : existing.description,
    oemPartHint: typeof body.oemPartHint === "string" ? body.oemPartHint.trim() : existing.oemPartHint,
    notes: typeof body.notes === "string" ? body.notes.trim() : existing.notes,
  };

  saveDatabase();
  res.json(dbMemory.oemSchedules[index]);
});

// ---------------------------------------------------------------------------
// Tuning Projects API
// ---------------------------------------------------------------------------

app.get("/api/tuning", (req, res) => {
  const { vehicleId } = req.query;
  let list = dbMemory.tuningStages;
  if (vehicleId && typeof vehicleId === "string") {
    list = list.filter((t) => t.vehicleId === vehicleId);
  }
  res.json(list);
});

app.post("/api/tuning", (req, res) => {
  const body = req.body as Partial<TuningStage>;
  if (!body.vehicleId || !body.title) {
    return res.status(400).json({ error: "vehicleId и title обязательны" });
  }

  const newStage: TuningStage = {
    id: body.id || `ts-${Date.now()}`,
    vehicleId: String(body.vehicleId).trim(),
    title: String(body.title).trim(),
    description: typeof body.description === "string" ? body.description.trim() : "",
    status: body.status === "in_progress" || body.status === "completed" ? body.status : "planned",
    estimatedBudget: Number(body.estimatedBudget) || 0,
    actualCost: Number(body.actualCost) || 0,
    parts: Array.isArray(body.parts) ? body.parts : [],
  };

  dbMemory.tuningStages.push(newStage);
  saveDatabase();
  res.status(201).json(newStage);
});

app.put("/api/tuning/:id", (req, res) => {
  const index = dbMemory.tuningStages.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Тюнинг-этап не найден" });
  }

  const existing = dbMemory.tuningStages[index];
  const body = (req.body || {}) as Record<string, unknown>;
  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) {
    return res.status(400).json({ error: "Название этапа не может быть пустым" });
  }
  if (body.status !== undefined && body.status !== "planned" && body.status !== "in_progress" && body.status !== "completed") {
    return res.status(400).json({ error: "Некорректный статус этапа" });
  }
  if (body.parts !== undefined && !Array.isArray(body.parts)) {
    return res.status(400).json({ error: "Поле parts должно быть массивом" });
  }

  dbMemory.tuningStages[index] = {
    ...existing,
    id: req.params.id,
    vehicleId: typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId.trim() : existing.vehicleId,
    title: typeof body.title === "string" ? body.title.trim() : existing.title,
    description: typeof body.description === "string" ? body.description.trim() : existing.description,
    status: (body.status as TuningStage["status"]) || existing.status,
    estimatedBudget: body.estimatedBudget !== undefined && Number.isFinite(Number(body.estimatedBudget)) ? Number(body.estimatedBudget) : existing.estimatedBudget,
    actualCost: body.actualCost !== undefined && Number.isFinite(Number(body.actualCost)) ? Number(body.actualCost) : existing.actualCost,
    parts: Array.isArray(body.parts) ? (body.parts as TuningStage["parts"]) : existing.parts,
  };

  saveDatabase();
  res.json(dbMemory.tuningStages[index]);
});

app.delete("/api/tuning/:id", (req, res) => {
  const id = req.params.id;
  const len = dbMemory.tuningStages.length;
  dbMemory.tuningStages = dbMemory.tuningStages.filter((t) => t.id !== id);

  if (dbMemory.tuningStages.length === len) {
    return res.status(404).json({ error: "Этап не найден" });
  }

  saveDatabase();
  res.json({ success: true, message: "Этап тюнинга удален" });
});

// ---------------------------------------------------------------------------
// Aggregated Statistics & Analytics API
// ---------------------------------------------------------------------------

app.get("/api/stats/:vehicleId", (req, res) => {
  const vId = req.params.vehicleId;
  const vehicle = dbMemory.vehicles.find((v) => v.id === vId);
  if (!vehicle) {
    return res.status(404).json({ error: "Автомобиль не найден" });
  }

  const services = dbMemory.serviceRecords.filter((s) => s.vehicleId === vId);
  const fuel = dbMemory.fuelRecords.filter((f) => f.vehicleId === vId);
  const parts = dbMemory.garageParts.filter((p) => p.vehicleId === vId);
  const tasks = dbMemory.toFixTasks.filter((t) => t.vehicleId === vId);
  const schedules = dbMemory.oemSchedules.filter((s) => s.vehicleId === vId);

  const totalServiceCost = services.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const totalFuelCost = fuel.reduce((sum, f) => sum + (f.totalCost || 0), 0);
  const totalPartsCost = parts.reduce((sum, p) => sum + (p.purchasePrice * p.quantity || 0), 0);
  const totalInvested = totalServiceCost + totalFuelCost + totalPartsCost;

  const totalFuelLiters = fuel.reduce((sum, f) => sum + (f.liters || 0), 0);
  const avgFuelPrice = fuel.length > 0 ? (totalFuelCost / totalFuelLiters).toFixed(2) : "0";

  // Fuel consumption calculation from logged entries with consumption
  const recordedConsumptions = fuel
    .map((f) => f.calculatedConsumption)
    .filter((c): c is number => typeof c === "number" && c > 0);
  const avgConsumption =
    recordedConsumptions.length > 0
      ? (recordedConsumptions.reduce((a, b) => a + b, 0) / recordedConsumptions.length).toFixed(1)
      : null;

  // Upcoming maintenance checklist calculations
  const upcomingAlerts = schedules
    .map((s) => {
      const lastKm = s.lastDoneKm || 0;
      const kmSince = vehicle.currentMileage - lastKm;
      const kmRemaining = s.intervalKm - kmSince;
      return {
        id: s.id,
        title: s.title,
        intervalKm: s.intervalKm,
        kmRemaining,
        isOverdue: kmRemaining < 0,
        isUrgent: kmRemaining <= 1500,
      };
    })
    .sort((a, b) => a.kmRemaining - b.kmRemaining);

  res.json({
    vehicleId: vId,
    currentMileage: vehicle.currentMileage,
    totalInvested,
    totalServiceCost,
    totalFuelCost,
    totalPartsCost,
    totalFuelLiters,
    avgFuelPrice,
    avgConsumption,
    pendingTasksCount: tasks.filter((t) => t.status === "pending").length,
    urgentMaintenanceCount: upcomingAlerts.filter((a) => a.isUrgent).length,
    upcomingAlerts: upcomingAlerts.slice(0, 5),
  });
});

// ---------------------------------------------------------------------------
// Administrator Auth & Backup Protection
// ---------------------------------------------------------------------------

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const ADMIN_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const AI_RATE_LIMIT = 20;
const AI_RATE_WINDOW_MS = 15 * 60 * 1000;
const aiRequestWindows = new Map<string, { count: number; startedAt: number }>();

function issueAdminToken(): string | null {
  if (!ADMIN_SECRET) return null;
  const expiresAt = Date.now() + ADMIN_TOKEN_TTL_MS;
  const signature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(String(expiresAt))
    .digest("base64url");
  return `${expiresAt}.${signature}`;
}

function verifyAdmin(req: express.Request): boolean {
  const token =
    req.headers["x-admin-key"] ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "");

  if (!ADMIN_SECRET || typeof token !== "string") return false;
  const [expiresAtText, signature] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (!expiresAt || expiresAt < Date.now() || !signature) return false;

  const expected = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(expiresAtText)
    .digest("base64url");
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function requireAiAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: "AI-функции не настроены на сервере." });
  }

  const clientId = req.ip || "unknown";
  const now = Date.now();
  const current = aiRequestWindows.get(clientId);
  const window = !current || now - current.startedAt >= AI_RATE_WINDOW_MS
    ? { count: 0, startedAt: now }
    : current;

  window.count += 1;
  aiRequestWindows.set(clientId, window);
  if (window.count > AI_RATE_LIMIT) {
    res.setHeader("Retry-After", Math.ceil((window.startedAt + AI_RATE_WINDOW_MS - now) / 1000));
    return res.status(429).json({ error: "Слишком много AI-запросов. Повторите попытку позже." });
  }
  return next();
}

function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (verifyAdmin(req)) {
    return next();
  }
  return res.status(403).json({
    error: "Доступ запрещен. Управление базой данных и бэкапом доступно только администратору.",
  });
}

const ADMIN_VERIFY_RATE_LIMIT = 8;
const ADMIN_VERIFY_WINDOW_MS = 15 * 60 * 1000;
const adminVerifyWindows = new Map<string, { count: number; startedAt: number }>();

function safeVerifyPassword(input: unknown, secret: string): boolean {
  if (typeof input !== "string" || !input) return false;
  const inputHash = crypto.createHash("sha256").update(input).digest();
  const secretHash = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(inputHash, secretHash);
}

// Admin login / key verification endpoint
app.post("/api/admin/verify", (req, res) => {
  const clientId = req.ip || "unknown";
  const now = Date.now();
  const current = adminVerifyWindows.get(clientId);
  const window =
    !current || now - current.startedAt >= ADMIN_VERIFY_WINDOW_MS
      ? { count: 0, startedAt: now }
      : current;

  if (window.count >= ADMIN_VERIFY_RATE_LIMIT) {
    res.setHeader("Retry-After", Math.ceil((window.startedAt + ADMIN_VERIFY_WINDOW_MS - now) / 1000));
    return res.status(429).json({
      success: false,
      error: "Слишком много попыток входа. Повторите попытку позже.",
    });
  }

  const { password } = req.body || {};
  if (!ADMIN_SECRET) {
    return res.status(503).json({ success: false, error: "ADMIN_SECRET не настроен на сервере." });
  }
  if (safeVerifyPassword(password, ADMIN_SECRET)) {
    adminVerifyWindows.delete(clientId);
    return res.json({
      success: true,
      token: issueAdminToken(),
      message: "Авторизация администратора успешно подтверждена",
    });
  }

  window.count += 1;
  adminVerifyWindows.set(clientId, window);
  return res.status(401).json({
    success: false,
    error: "Неверный пароль или ключ администратора.",
  });
});

// Backup, Export, and Restore API (Strictly protected for Administrator)
// ---------------------------------------------------------------------------

app.get("/api/backup/export", requireAdminAuth, (_req, res) => {
  res.setHeader("Content-Disposition", `attachment; filename="garagehub_backup_${Date.now()}.json"`);
  res.setHeader("Content-Type", "application/json");
  res.json(dbMemory);
});

app.post("/api/backup/import", requireAdminAuth, (req, res) => {
  try {
    const data = req.body;
    if (!data || !Array.isArray(data.vehicles) || data.vehicles.length === 0) {
      return res.status(400).json({ error: "Некорректный формат файла резервной копии" });
    }

    const validVehicles: Vehicle[] = [];
    for (const v of data.vehicles) {
      if (!v || typeof v !== "object" || typeof v.id !== "string" || typeof v.make !== "string" || typeof v.model !== "string") {
        return res.status(400).json({ error: "Некорректная структура автомобилей в резервной копии" });
      }
      validVehicles.push({
        id: v.id.trim(),
        make: v.make.trim(),
        model: v.model.trim(),
        generation: typeof v.generation === "string" ? v.generation.trim() : "",
        year: Number(v.year) || new Date().getFullYear(),
        licensePlate: typeof v.licensePlate === "string" ? v.licensePlate.trim() : "",
        vin: typeof v.vin === "string" ? v.vin.trim() : "",
        engine: typeof v.engine === "string" ? v.engine.trim() : "Стандарт",
        fuelType: typeof v.fuelType === "string" ? v.fuelType : "Бензин (АИ-95)",
        transmission: typeof v.transmission === "string" ? v.transmission : "Автомат",
        driveType: typeof v.driveType === "string" ? v.driveType : "Передний",
        currentMileage: Number(v.currentMileage) || 0,
        lastMileageUpdate: typeof v.lastMileageUpdate === "string" ? v.lastMileageUpdate : new Date().toLocaleDateString("ru-RU"),
        colorHex: typeof v.colorHex === "string" && /^#[0-9a-f]{6}$/i.test(v.colorHex) ? v.colorHex : "#dc2626",
        bodyType: typeof v.bodyType === "string" && VALID_BODY_TYPES.has(v.bodyType as any) ? v.bodyType : "sedan",
        photoUrl: typeof v.photoUrl === "string" ? v.photoUrl : undefined,
        model3dUrl: typeof v.model3dUrl === "string" ? v.model3dUrl : undefined,
      });
    }

    const validServiceRecords: ServiceRecord[] = Array.isArray(data.serviceRecords)
      ? data.serviceRecords
          .filter((r: any) => r && typeof r === "object" && typeof r.id === "string" && typeof r.vehicleId === "string" && typeof r.title === "string")
          .map((r: any) => ({
            id: r.id,
            vehicleId: r.vehicleId,
            date: typeof r.date === "string" ? r.date : new Date().toISOString().slice(0, 10),
            mileage: Number(r.mileage) || 0,
            category: r.category || "ТО и замена жидкостей",
            title: r.title,
            description: typeof r.description === "string" ? r.description : "",
            laborCost: Number(r.laborCost) || 0,
            parts: Array.isArray(r.parts) ? r.parts.filter((p: any) => p && typeof p.name === "string").map((p: any, i: number) => ({
              id: typeof p.id === "string" ? p.id : `p-${i}`,
              name: String(p.name || ""),
              brand: String(p.brand || ""),
              partNumber: String(p.partNumber || ""),
              quantity: Number(p.quantity) || 1,
              unitPrice: Number(p.unitPrice) || 0,
            })) : [],
            totalCost: Number(r.totalCost) || 0,
            serviceCenter: typeof r.serviceCenter === "string" ? r.serviceCenter : "",
            receiptImages: Array.isArray(r.receiptImages) ? r.receiptImages.filter((x: any) => typeof x === "string") : [],
            notes: typeof r.notes === "string" ? r.notes : "",
          }))
      : [];

    dbMemory = {
      vehicles: validVehicles,
      serviceRecords: validServiceRecords,
      fuelRecords: Array.isArray(data.fuelRecords) ? data.fuelRecords.filter((f: any) => f && typeof f === "object" && typeof f.id === "string" && typeof f.vehicleId === "string") : [],
      oemSchedules: Array.isArray(data.oemSchedules) ? data.oemSchedules.filter((s: any) => s && typeof s === "object" && typeof s.id === "string" && typeof s.vehicleId === "string") : [],
      garageParts: Array.isArray(data.garageParts) ? data.garageParts.filter((p: any) => p && typeof p === "object" && typeof p.id === "string" && typeof p.name === "string") : [],
      toFixTasks: Array.isArray(data.toFixTasks) ? data.toFixTasks.filter((t: any) => t && typeof t === "object" && typeof t.id === "string" && typeof t.title === "string") : [],
      tuningStages: Array.isArray(data.tuningStages) ? data.tuningStages.filter((t: any) => t && typeof t === "object" && typeof t.id === "string" && typeof t.title === "string") : [],
      lastUpdated: new Date().toISOString(),
    };

    saveDatabase();
    res.json({ success: true, message: "Данные успешно импортированы", counts: {
      vehicles: dbMemory.vehicles.length,
      services: dbMemory.serviceRecords.length,
    }});
  } catch (err: any) {
    res.status(500).json({ error: "Ошибка импорта", details: err.message });
  }
});

app.post("/api/backup/reset", requireAdminAuth, (_req, res) => {
  dbMemory = getInitialDatabase();
  saveDatabase();
  res.json({ success: true, message: "База данных сброшена к демонстрационным данным", data: dbMemory });
});

// ---------------------------------------------------------------------------
// AI Diagnostic & Gemini Endpoints
// ---------------------------------------------------------------------------

// 1. Diagnostic Assistant
app.post("/api/ai/diagnose", requireAiAccess, async (req, res) => {
  try {
    const problemDescription =
      req.body.problemDescription || req.body.symptoms || "";
    const vehicle =
      req.body.vehicle || {
        make: req.body.make,
        model: req.body.model,
        generation: req.body.generation,
        year: req.body.year,
        engine: req.body.engine,
        currentMileage: req.body.currentMileage,
        transmission: req.body.transmission,
        driveType: req.body.driveType,
      };
    const userNotes = req.body.userNotes || "";
    const recentHistory =
      req.body.recentHistory ||
      (Array.isArray(req.body.serviceHistory)
        ? JSON.stringify(req.body.serviceHistory)
        : req.body.serviceHistory || "");

    if (!problemDescription || typeof problemDescription !== "string") {
      return res
        .status(400)
        .json({ error: "Необходимо описать проблему или симптом." });
    }

    const knowledgeContext = searchKnowledge(problemDescription, {
      brand: vehicle?.make || undefined,
      model: vehicle?.model || undefined,
      generation: vehicle?.generation || undefined,
    }).slice(0, 5);
    const retrievedContext = knowledgeContext.length
      ? knowledgeContext.map((item) => `[${item.metadata.category}] ${item.text} (Источник: ${item.metadata.source})`).join("\n")
      : "Подходящих подтверждённых фрагментов локальной базы нет. Не выдавай предположения за факт.";

    const ai = getAi();
    const prompt = `Ты — ведущий профессиональный автомеханик и диагност в сервисной системе "GarageHub Rev".
Твоя задача: на основе точного профиля автомобиля, его пробега, истории недавних ремонтов и описанных симптомов дать структурированную, практически полезную и объективную диагностику.

ДАННЫЕ АВТОМОБИЛЯ:
- Марка и модель: ${vehicle?.make || "Не указана"} ${vehicle?.model || ""} (${vehicle?.generation || ""})
- Год выпуска: ${vehicle?.year || "Не указан"}
- Текущий пробег: ${vehicle?.currentMileage ? vehicle.currentMileage.toLocaleString("ru-RU") + " км" : "Не указан"}
- Двигатель / КПП: ${vehicle?.engine || "Стандарт"} / ${vehicle?.transmission || "Стандарт"}
- Тип привода: ${vehicle?.driveType || "Стандарт"}

ИСТОРИЯ ПРЕДЫДУЩИХ ОБСЛУЖИВАНИЙ:
${recentHistory || "Ранее зафиксированных записей нет или стандартное ТО."}

ОПИСАНИЕ СИМПТОМОВ / ЖАЛОБА ВЛАДЕЛЬЦА:
"${problemDescription}"
${userNotes ? `Дополнительные примечания: ${userNotes}` : ""}

РЕЛЕВАНТНЫЙ КОНТЕКСТ KNOWLEDGE BASE (RAG):
${retrievedContext}

Правила: отделяй подтверждённые сведения от диагностических гипотез; для тормозов, рулевого управления, перегрева, топлива, двигателя и подушек безопасности явно указывай уровень риска. Если данных для точного вывода нет, скажи, что нужна проверка по официальному руководству или на СТО.

Сформируй ответ в формате JSON строго по следующей схеме:
{
  "primaryDiagnosis": "Краткое название наиболее вероятной неисправности",
  "summary": "краткий профессиональный вывод (1-2 предложения)",
  "confidence": 88,
  "urgency": "high" | "medium" | "low",
  "safetyAssessment": "оценка риска для безопасности движения",
  "likelyCauses": [
    {
      "cause": "название причины",
      "probability": 80
    },
    {
      "cause": "вторая возможная причина",
      "probability": 15
    }
  ],
  "possibleCauses": [
    {
      "cause": "название причины",
      "probability": "Высокая" | "Средняя" | "Низкая",
      "explanation": "подробное объяснение механизма неисправности",
      "checkMethod": "как проверить в гараже или на СТО"
    }
  ],
  "diagnosticSteps": ["шаг 1 проверки", "шаг 2", "шаг 3"],
  "estimatedCostRange": "диапазон стоимости (например '5 000 — 12 000 ₽')",
  "estimatedCost": "5 000 — 12 000 ₽",
  "recommendedParts": [
    {
      "name": "Наименование детали",
      "partNumber": "каталожный номер OEM / кросс",
      "brand": "рекомендуемые бренды (например Mann, Brembo, SKF)"
    }
  ],
  "mechanicTip": "совет мастера для владельца именно этого кузова/модели/мотора",
  "proTip": "совет мастера"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = parseJsonSafely(response.text, {});
    res.json(parsed);
  } catch (error: any) {
    console.error("Diagnostic AI error:", error);
    res.status(500).json({
      error: "Не удалось провести AI-диагностику.",
    });
  }
});

// 2. Receipt OCR Scanner
app.post("/api/ai/scan-receipt", requireAiAccess, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Изображение чека не предоставлено." });
    }

    // Detect MIME type from data URI if present
    let detectedMime = "image/jpeg";
    const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9+/.-]+);base64,/);
    if (mimeMatch) {
      detectedMime = mimeMatch[1];
    } else if (mimeType) {
      detectedMime = mimeType;
    }

    // Gemini requires supported image types (jpeg, png, webp, heic)
    let supportedMime = detectedMime;
    if (detectedMime.includes("png")) supportedMime = "image/png";
    else if (detectedMime.includes("webp")) supportedMime = "image/webp";
    else if (detectedMime.includes("svg")) supportedMime = "image/png"; // fallback container
    else supportedMime = "image/jpeg";

    const cleanBase64 = imageBase64
      .replace(/^data:[a-zA-Z0-9+/.-]+;base64,/, "")
      .replace(/^data:image\/\w+;base64,/, "")
      .trim();

    const ai = getAi();

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: supportedMime,
            },
          },
          {
            text: `Проанализируй фото автомобильного чека, заказ-наряда, квитанции СТО, чека АЗС или магазина автозапчастей.
Извлеки точные данные и верни JSON со структурой:
{
  "merchantName": "название СТО, АЗС или магазина",
  "date": "дата в формате YYYY-MM-DD, если есть, иначе сегодня",
  "totalAmount": 12500,
  "category": "repair" | "fuel" | "parts" | "wash" | "tires" | "tuning" | "other",
  "description": "краткое общее описание чека, например 'Замена моторного масла и фильтра в Fit Service'",
  "fuelDetails": {
    "fuelType": "АИ-95" | "ДТ" | null,
    "liters": 45.2,
    "pricePerLiter": 58.4
  },
  "works": [
    {
      "description": "Замена масла ДВС",
      "cost": 1500
    }
  ],
  "parts": [
    {
      "name": "Масло моторное 5W-40",
      "brand": "Motul",
      "partNumber": "102784",
      "quantity": 1,
      "price": 5400
    }
  ],
  "notes": "любые важные примечания: гарантия, рекомендации мастера"
}`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = parseJsonSafely(response.text, {});
    res.json(parsed);
  } catch (error: any) {
    console.error("Receipt OCR error:", error);
    res.status(500).json({
      error: "Не удалось распознать чек.",
    });
  }
});

// 3. OEM Factory Schedule Generator
app.post("/api/ai/oem-schedule", requireAiAccess, async (req, res) => {
  try {
    const { make, model, year, engine, fuelType } = req.body;
    const ai = getAi();

    const prompt = `Сформируй регламент заводского технического обслуживания (OEM Service Schedule) для автомобиля:
- Марка: ${make}
- Модель: ${model}
- Год выпуска: ${year}
- Двигатель / модификация: ${engine || "Стандартный двигатель"}
- Тип топлива: ${fuelType || "Бензин"}

Опирайся на официальные заводские сервисные книжки (Toyota, Nissan, VAG, BMW, Hyundai/Kia и др.) и адаптацию для умеренных условий эксплуатации.
Сформируй JSON со следующими полями:
{
  "recommendationSummary": "общее описание регламента, например 'Интервал ТО: 10 000 км или 12 месяцев'",
  "oilSpec": "рекомендуемая вязкость и допуск масла, например '5W-30 API SP / ILSAC GF-6'",
  "oilVolumeLiters": 4.4,
  "items": [
    {
      "id": "engine-oil",
      "title": "Моторное масло и масляный фильтр",
      "category": "ТО и замена жидкостей",
      "intervalKm": 10000,
      "intervalMonths": 12,
      "description": "краткий совет по регламенту",
      "oemPartHint": "совет по артикулам или характеристикам"
    }
  ],
  "criticalWeakPoints": [
    "1-3 известных слабых места или особенности регламента для этой модели"
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = parseJsonSafely(response.text, {});
    res.json(parsed);
  } catch (error: any) {
    console.error("OEM schedule error:", error);
    res.status(500).json({
      error: "Не удалось загрузить OEM-регламент.",
    });
  }
});

// 4. Smart Spare Part Cross-Reference & Advisor
app.post("/api/ai/part-lookup", requireAiAccess, async (req, res) => {
  try {
    const { partName, vehicle, partNumber } = req.body;
    const ai = getAi();

    const prompt = `Ты — эксперт по подбору автозапчастей и кросс-номеров (каталоги TecDoc, EPC).
Автомобиль: ${vehicle?.make || ""} ${vehicle?.model || ""} ${vehicle?.generation || ""} (${vehicle?.year || ""}), двигатель: ${vehicle?.engine || ""}.
Запрос детали: "${partName}" ${partNumber ? `(Артикул: ${partNumber})` : ""}

Предоставь рекомендации по артикулам и производителям в формате JSON:
{
  "standardName": "Точное наименование узла",
  "oemArticle": "Оригинальный каталожный номер (OEM)",
  "recommendedBrands": [
    {
      "tier": "Премиум / Поставщик конвейера",
      "brand": "название бренда (например Lemförder, Mann, Brembo, NGK, Denso)",
      "partNumber": "артикул кросса",
      "approxPriceRub": "ориентировочная цена в рублях",
      "rating": "Оригинальное качество / Лучший выбор"
    },
    {
      "tier": "Качественный дубликат",
      "brand": "название бренда (например CTR, Hi-Q, Filtron, TRW, Kayaba)",
      "partNumber": "артикул кросса",
      "approxPriceRub": "ориентировочная цена в рублях",
      "rating": "Оптимальное соотношение цена/качество"
    }
  ],
  "replacementTip": "Важная техническая тонкость при установке (момент затяжки, замена сопутствующих прокладок/болтов)",
  "intervalsAdvice": "Рекомендуемый интервал проверки/замены"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = parseJsonSafely(response.text, {});
    res.json(parsed);
  } catch (error: any) {
    console.error("Part lookup error:", error);
    res.status(500).json({
      error: "Не удалось подобрать запчасть.",
    });
  }
});

// ---------------------------------------------------------------------------
// Server Initialization with Vite Integration
// ---------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GarageHub Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
