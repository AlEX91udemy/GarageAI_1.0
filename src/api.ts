import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  OemScheduleItem,
  GaragePart,
  ToFixTask,
  TuningStage,
  DiagnosticResult,
} from "./types";import type { Brand, Model, Generation, Modification, KnowledgeChunk } from "./catalog/types";

export interface FullGarageData {
  vehicles: Vehicle[];
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  oemSchedules: OemScheduleItem[];
  garageParts: GaragePart[];
  toFixTasks: ToFixTask[];
  tuningStages: TuningStage[];
  lastUpdated: string;
}

export interface VehicleStats {
  vehicleId: string;
  currentMileage: number;
  totalInvested: number;
  totalServiceCost: number;
  totalFuelCost: number;
  totalPartsCost: number;
  totalFuelLiters: number;
  avgFuelPrice: string;
  avgConsumption: string | null;
  pendingTasksCount: number;
  urgentMaintenanceCount: number;
  upcomingAlerts: Array<{
    id: string;
    title: string;
    intervalKm: number;
    kmRemaining: number;
    isOverdue: boolean;
    isUrgent: boolean;
  }>;
}

export interface PartLookupResult {
  standardName: string;
  oemArticle: string;
  recommendedBrands: Array<{
    tier: string;
    brand: string;
    partNumber: string;
    approxPriceRub: string;
    rating: string;
  }>;
  replacementTip: string;
  intervalsAdvice: string;
}

export interface CatalogSearchResult extends Model {
  brand: Brand | null;
  generations: Generation[];
}

export async function fetchCatalogBrands(): Promise<Brand[]> {
  const res = await fetch("/api/vehicles/brands");
  if (!res.ok) throw new Error("Не удалось загрузить марки каталога");
  return res.json();
}

export async function fetchCatalogModels(brandId: string): Promise<Model[]> {
  const res = await fetch(`/api/vehicles/brands/${encodeURIComponent(brandId)}/models`);
  if (!res.ok) throw new Error("Не удалось загрузить модели каталога");
  return res.json();
}

export async function fetchCatalogGenerations(modelId: string): Promise<Generation[]> {
  const res = await fetch(`/api/vehicles/models/${encodeURIComponent(modelId)}/generations`);
  if (!res.ok) throw new Error("Не удалось загрузить поколения каталога");
  return res.json();
}

export async function fetchCatalogModifications(generationId: string): Promise<Modification[]> {
  const res = await fetch(`/api/vehicles/generations/${encodeURIComponent(generationId)}/modifications`);
  if (!res.ok) throw new Error("Не удалось загрузить модификации каталога");
  return res.json();
}

export async function searchVehicleCatalog(query: string): Promise<CatalogSearchResult[]> {
  const res = await fetch(`/api/vehicles/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Не удалось выполнить поиск в каталоге");
  return res.json();
}

export async function searchTechnicalKnowledge(query: string, context: Partial<{ brand: string; model: string; generation: string; category: string }> = {}): Promise<{ chunks: Array<KnowledgeChunk & { score: number }>; sources: unknown[] }> {
  const params = new URLSearchParams({ q: query });
  Object.entries(context).forEach(([key, value]) => value && params.set(key, value));
  const res = await fetch(`/api/knowledge/search?${params.toString()}`);
  if (!res.ok) throw new Error("Не удалось выполнить поиск технических знаний");
  return res.json();
}

// Fetch all garage data
export async function fetchGarageData(): Promise<FullGarageData> {
  const res = await fetch("/api/data");
  if (!res.ok) {
    throw new Error(`Ошибка загрузки данных с сервера: ${res.status}`);
  }
  return res.json();
}

// Health check
export async function checkBackendHealth(): Promise<{
  status: string;
  hasApiKey: boolean;
  vehiclesCount: number;
  serviceRecordsCount: number;
}> {
  const res = await fetch("/api/health");
  if (!res.ok) {
    throw new Error("Сервер недоступен");
  }
  return res.json();
}

// Vehicle APIs
export async function createVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
  const res = await fetch("/api/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vehicle),
  });
  if (!res.ok) throw new Error("Не удалось создать автомобиль");
  return res.json();
}

export async function updateVehicle(id: string, vehicle: Partial<Vehicle>): Promise<Vehicle> {
  const res = await fetch(`/api/vehicles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vehicle),
  });
  if (!res.ok) throw new Error("Не удалось обновить данные автомобиля");
  return res.json();
}

export async function updateMileage(id: string, mileage: number): Promise<Vehicle> {
  const res = await fetch(`/api/vehicles/${id}/mileage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mileage }),
  });
  if (!res.ok) throw new Error("Не удалось обновить пробег");
  return res.json();
}

export async function deleteVehicle(id: string): Promise<void> {
  const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить автомобиль");
}

// Service Record APIs
export async function createServiceRecord(
  record: Partial<ServiceRecord> & { completedTaskId?: string }
): Promise<ServiceRecord> {
  const res = await fetch("/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error("Не удалось сохранить запись ТО");
  return res.json();
}

export async function updateServiceRecord(id: string, record: Partial<ServiceRecord>): Promise<ServiceRecord> {
  const res = await fetch(`/api/services/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error("Не удалось обновить запись ТО");
  return res.json();
}

export async function deleteServiceRecord(id: string): Promise<void> {
  const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить запись ТО");
}

// Fuel APIs
export async function createFuelRecord(fuel: Partial<FuelRecord>): Promise<FuelRecord> {
  const res = await fetch("/api/fuel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fuel),
  });
  if (!res.ok) throw new Error("Не удалось сохранить заправку");
  return res.json();
}

export async function deleteFuelRecord(id: string): Promise<void> {
  const res = await fetch(`/api/fuel/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить заправку");
}

// Spare Parts Warehouse APIs
export async function createGaragePart(part: Partial<GaragePart>): Promise<GaragePart> {
  const res = await fetch("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(part),
  });
  if (!res.ok) throw new Error("Не удалось добавить деталь на склад");
  return res.json();
}

export async function updateGaragePart(id: string, part: Partial<GaragePart>): Promise<GaragePart> {
  const res = await fetch(`/api/inventory/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(part),
  });
  if (!res.ok) throw new Error("Не удалось обновить деталь");
  return res.json();
}

export async function installGaragePart(id: string): Promise<{ success: boolean; part: GaragePart }> {
  const res = await fetch(`/api/inventory/${id}/install`, { method: "POST" });
  if (!res.ok) throw new Error("Не удалось установить деталь");
  return res.json();
}

export async function deleteGaragePart(id: string): Promise<void> {
  const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить деталь со склада");
}

// To-Fix Tasks APIs
export async function createToFixTask(task: Partial<ToFixTask>): Promise<ToFixTask> {
  const res = await fetch("/api/to-fix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Не удалось создать задачу");
  return res.json();
}

export async function updateToFixTask(id: string, task: Partial<ToFixTask>): Promise<ToFixTask> {
  const res = await fetch(`/api/to-fix/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Не удалось обновить задачу");
  return res.json();
}

export async function completeToFixTask(id: string): Promise<{ success: boolean; task: ToFixTask }> {
  const res = await fetch(`/api/to-fix/${id}/complete`, { method: "POST" });
  if (!res.ok) throw new Error("Не удалось завершить задачу");
  return res.json();
}

export async function deleteToFixTask(id: string): Promise<void> {
  const res = await fetch(`/api/to-fix/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить задачу");
}

// OEM Schedule APIs
export async function updateOemScheduleItem(id: string, item: Partial<OemScheduleItem>): Promise<OemScheduleItem> {
  const res = await fetch(`/api/oem-schedule/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error("Не удалось обновить пункт регламента");
  return res.json();
}

export async function saveOemScheduleItems(vehicleId: string, items: Partial<OemScheduleItem>[]): Promise<OemScheduleItem[]> {
  const res = await fetch("/api/oem-schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId, items }),
  });
  if (!res.ok) throw new Error("Не удалось сохранить регламент");
  return res.json();
}

// Tuning APIs
export async function createTuningStage(stage: Partial<TuningStage>): Promise<TuningStage> {
  const res = await fetch("/api/tuning", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stage),
  });
  if (!res.ok) throw new Error("Не удалось сохранить тюнинг-этап");
  return res.json();
}

export async function updateTuningStage(id: string, stage: Partial<TuningStage>): Promise<TuningStage> {
  const res = await fetch(`/api/tuning/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stage),
  });
  if (!res.ok) throw new Error("Не удалось обновить тюнинг-этап");
  return res.json();
}

export async function deleteTuningStage(id: string): Promise<void> {
  const res = await fetch(`/api/tuning/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить тюнинг-этап");
}

// Aggregated Stats
export async function fetchVehicleStats(vehicleId: string): Promise<VehicleStats> {
  const res = await fetch(`/api/stats/${vehicleId}`);
  if (!res.ok) throw new Error("Не удалось загрузить аналитику");
  return res.json();
}

// AI APIs
export async function requestAiDiagnosis(payload: {
  vehicle: Vehicle;
  problemDescription: string;
  userNotes?: string;
  recentHistory?: string;
}): Promise<DiagnosticResult> {
  const res = await fetch("/api/ai/diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не удалось получить AI-диагностику");
  }
  return res.json();
}

export async function requestReceiptOcr(imageBase64: string, mimeType = "image/jpeg"): Promise<any> {
  const res = await fetch("/api/ai/scan-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не удалось распознать чек");
  }
  return res.json();
}

export async function requestOemScheduleAi(payload: {
  make: string;
  model: string;
  year: number;
  engine?: string;
  fuelType?: string;
}): Promise<any> {
  const res = await fetch("/api/ai/oem-schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не удалось загрузить OEM регламент");
  }
  return res.json();
}

export async function requestPartLookupAi(payload: {
  partName: string;
  vehicle: Vehicle;
  partNumber?: string;
}): Promise<PartLookupResult> {
  const res = await fetch("/api/ai/part-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не удалось подобрать кроссы детали");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Tuning Stage APIs
// ---------------------------------------------------------------------------

export async function createTuningStage(stage: Partial<TuningStage>): Promise<TuningStage> {
  const res = await fetch("/api/tuning", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stage),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не удалось создать этап тюнинга");
  }
  return res.json();
}

export async function updateTuningStage(id: string, updates: Partial<TuningStage>): Promise<TuningStage> {
  const res = await fetch(`/api/tuning/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не удалось обновить этап тюнинга");
  }
  return res.json();
}

export async function deleteTuningStage(id: string): Promise<void> {
  const res = await fetch(`/api/tuning/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не удалось удалить этап тюнинга");
  }
}

// ---------------------------------------------------------------------------
// Admin Authentication & Session Management
// ---------------------------------------------------------------------------

const ADMIN_TOKEN_KEY = "garagehub_admin_token";

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // ignore storage quota errors
  }
}

export function isAdminAuthenticated(): boolean {
  return Boolean(getAdminToken());
}

export function adminLogout(): void {
  setAdminToken(null);
}

export async function verifyAdminPassword(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setAdminToken(data.token);
      return { success: true, token: data.token };
    }
    return { success: false, error: data.error || "Неверный пароль администратора" };
  } catch (err: any) {
    return { success: false, error: "Ошибка соединения с сервером при проверке прав: " + (err.message || "") };
  }
}

// Backup & Reset APIs (Admin Restricted)
export async function resetDatabase(customToken?: string): Promise<FullGarageData> {
  const token = customToken || getAdminToken() || "";
  const res = await fetch("/api/backup/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": token,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не удалось сбросить базу данных. Требуются права администратора.");
  }
  const data = await res.json();
  return data.data;
}

export async function importDatabaseBackup(backupData: any, customToken?: string): Promise<void> {
  const token = customToken || getAdminToken() || "";
  const res = await fetch("/api/backup/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": token,
    },
    body: JSON.stringify(backupData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не удалось восстановить базу данных. Требуются права администратора.");
  }
}
