import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  OemScheduleItem,
  GaragePart,
  ToFixTask,
  TuningStage,
  DiagnosticResult,
  ReminderRecord,
} from "./types";import type { Brand, Model, Generation, Modification, KnowledgeChunk } from "./catalog/types";

let csrfToken: string | null = null;
let authSessionActive = false;

export interface AuthSession {
  username: string;
  email?: string;
  csrfToken: string;
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (init.method && !["GET", "HEAD", "OPTIONS"].includes(init.method.toUpperCase()) && csrfToken) {
    headers.set("x-csrf-token", csrfToken);
  }
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}

export async function register(username: string, password: string, email?: string): Promise<AuthSession | null> {
  const res = await authenticatedFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ username, password, ...(email ? { email } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Не удалось создать аккаунт");
  if (data.emailVerificationRequired) return null;
  csrfToken = data.session.csrfToken;
  authSessionActive = true;
  return data.session;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const res = await authenticatedFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Не удалось войти");
  csrfToken = data.session.csrfToken;
  authSessionActive = true;
  return data.session;
}

export async function requestEmailLoginCode(email: string, password: string): Promise<string> {
  const res = await authenticatedFetch("/api/auth/email-code/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Не удалось отправить код");
  return typeof data.message === "string" ? data.message : "Код отправлен на почту.";
}

export async function verifyEmailLoginCode(email: string, code: string): Promise<AuthSession> {
  const res = await authenticatedFetch("/api/auth/email-code/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Не удалось подтвердить код");
  csrfToken = data.session.csrfToken;
  authSessionActive = true;
  return data.session;
}

export async function restoreSession(): Promise<AuthSession | null> {
  const res = await authenticatedFetch("/api/auth/session", { credentials: "same-origin" });
  if (!res.ok) { csrfToken = null; authSessionActive = false; return null; }
  const data = await res.json();
  csrfToken = data.csrfToken;
  authSessionActive = true;
  return data as AuthSession;
}

export async function logout(): Promise<void> {
  await authenticatedFetch("/api/auth/logout", { method: "POST" });
  csrfToken = null;
  authSessionActive = false;
}

export interface FullGarageData {
  vehicles: Vehicle[];
  reminders: ReminderRecord[];
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

// Reminder APIs
export async function fetchReminders(): Promise<ReminderRecord[]> {
  const res = await authenticatedFetch("/api/reminders");
  if (!res.ok) throw new Error("Не удалось загрузить напоминания");
  return res.json();
}

export async function createReminder(reminder: Partial<ReminderRecord>): Promise<ReminderRecord> {
  const res = await authenticatedFetch("/api/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reminder),
  });
  if (!res.ok) throw new Error("Не удалось создать напоминание");
  return res.json();
}

export async function updateReminder(id: string, reminder: Partial<ReminderRecord>): Promise<ReminderRecord> {
  const res = await authenticatedFetch(`/api/reminders/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reminder),
  });
  if (!res.ok) throw new Error("Не удалось обновить напоминание");
  return res.json();
}

export async function deleteReminder(id: string): Promise<void> {
  const res = await authenticatedFetch(`/api/reminders/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить напоминание");
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
  const res = await authenticatedFetch("/api/vehicles/brands");
  if (!res.ok) throw new Error("Не удалось загрузить марки каталога");
  return res.json();
}

export async function fetchCatalogModels(brandId: string): Promise<Model[]> {
  const res = await authenticatedFetch(`/api/vehicles/brands/${encodeURIComponent(brandId)}/models`);
  if (!res.ok) throw new Error("Не удалось загрузить модели каталога");
  return res.json();
}

export async function fetchCatalogGenerations(modelId: string): Promise<Generation[]> {
  const res = await authenticatedFetch(`/api/vehicles/models/${encodeURIComponent(modelId)}/generations`);
  if (!res.ok) throw new Error("Не удалось загрузить поколения каталога");
  return res.json();
}

export async function fetchCatalogModifications(generationId: string): Promise<Modification[]> {
  const res = await authenticatedFetch(`/api/vehicles/generations/${encodeURIComponent(generationId)}/modifications`);
  if (!res.ok) throw new Error("Не удалось загрузить модификации каталога");
  return res.json();
}

export async function searchVehicleCatalog(query: string): Promise<CatalogSearchResult[]> {
  const res = await authenticatedFetch(`/api/vehicles/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Не удалось выполнить поиск в каталоге");
  return res.json();
}

export async function searchTechnicalKnowledge(query: string, context: Partial<{ brand: string; model: string; generation: string; category: string }> = {}): Promise<{ chunks: Array<KnowledgeChunk & { score: number }>; sources: unknown[] }> {
  const params = new URLSearchParams({ q: query });
  Object.entries(context).forEach(([key, value]) => value && params.set(key, value));
  const res = await authenticatedFetch(`/api/knowledge/search?${params.toString()}`);
  if (!res.ok) throw new Error("Не удалось выполнить поиск технических знаний");
  return res.json();
}

// Fetch all garage data
export async function fetchGarageData(): Promise<FullGarageData> {
  const res = await authenticatedFetch("/api/data");
  if (!res.ok) {
    throw new Error(`Ошибка загрузки данных с сервера: ${res.status}`);
  }
  return res.json();
}

// Health check
export async function checkBackendHealth(): Promise<{
  status: string;
  hasApiKey: boolean;
  hasAiConfigured: boolean;
  hasGeminiConfigured: boolean;
  vertexAiEnabled: boolean;
  vehiclesCount: number;
  serviceRecordsCount: number;
}> {
  const res = await authenticatedFetch("/api/health");
  if (!res.ok) {
    throw new Error("Сервер недоступен");
  }
  return res.json();
}

// Vehicle APIs
export async function createVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
  const res = await authenticatedFetch("/api/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vehicle),
  });
  if (!res.ok) throw new Error("Не удалось создать автомобиль");
  return res.json();
}

export async function updateVehicle(id: string, vehicle: Partial<Vehicle>): Promise<Vehicle> {
  const res = await authenticatedFetch(`/api/vehicles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vehicle),
  });
  if (!res.ok) throw new Error("Не удалось обновить данные автомобиля");
  return res.json();
}

export async function updateMileage(id: string, mileage: number): Promise<Vehicle> {
  const res = await authenticatedFetch(`/api/vehicles/${id}/mileage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mileage }),
  });
  if (!res.ok) throw new Error("Не удалось обновить пробег");
  return res.json();
}

export async function deleteVehicle(id: string): Promise<void> {
  const res = await authenticatedFetch(`/api/vehicles/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить автомобиль");
}

// Service Record APIs
export async function createServiceRecord(
  record: Partial<ServiceRecord> & { completedTaskId?: string }
): Promise<ServiceRecord> {
  const res = await authenticatedFetch("/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error("Не удалось сохранить запись ТО");
  return res.json();
}

export async function updateServiceRecord(id: string, record: Partial<ServiceRecord>): Promise<ServiceRecord> {
  const res = await authenticatedFetch(`/api/services/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error("Не удалось обновить запись ТО");
  return res.json();
}

export async function deleteServiceRecord(id: string): Promise<void> {
  const res = await authenticatedFetch(`/api/services/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить запись ТО");
}

// Fuel APIs
export async function createFuelRecord(fuel: Partial<FuelRecord>): Promise<FuelRecord> {
  const res = await authenticatedFetch("/api/fuel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fuel),
  });
  if (!res.ok) throw new Error("Не удалось сохранить заправку");
  return res.json();
}

export async function deleteFuelRecord(id: string): Promise<void> {
  const res = await authenticatedFetch(`/api/fuel/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить заправку");
}

// Spare Parts Warehouse APIs
export async function createGaragePart(part: Partial<GaragePart>): Promise<GaragePart> {
  const res = await authenticatedFetch("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(part),
  });
  if (!res.ok) throw new Error("Не удалось добавить деталь на склад");
  return res.json();
}

export async function updateGaragePart(id: string, part: Partial<GaragePart>): Promise<GaragePart> {
  const res = await authenticatedFetch(`/api/inventory/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(part),
  });
  if (!res.ok) throw new Error("Не удалось обновить деталь");
  return res.json();
}

export async function installGaragePart(id: string): Promise<{ success: boolean; part: GaragePart }> {
  const res = await authenticatedFetch(`/api/inventory/${id}/install`, { method: "POST" });
  if (!res.ok) throw new Error("Не удалось установить деталь");
  return res.json();
}

export async function deleteGaragePart(id: string): Promise<void> {
  const res = await authenticatedFetch(`/api/inventory/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить деталь со склада");
}

// To-Fix Tasks APIs
export async function createToFixTask(task: Partial<ToFixTask>): Promise<ToFixTask> {
  const res = await authenticatedFetch("/api/to-fix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Не удалось создать задачу");
  return res.json();
}

export async function updateToFixTask(id: string, task: Partial<ToFixTask>): Promise<ToFixTask> {
  const res = await authenticatedFetch(`/api/to-fix/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Не удалось обновить задачу");
  return res.json();
}

export async function completeToFixTask(id: string): Promise<{ success: boolean; task: ToFixTask }> {
  const res = await authenticatedFetch(`/api/to-fix/${id}/complete`, { method: "POST" });
  if (!res.ok) throw new Error("Не удалось завершить задачу");
  return res.json();
}

export async function deleteToFixTask(id: string): Promise<void> {
  const res = await authenticatedFetch(`/api/to-fix/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить задачу");
}

// OEM Schedule APIs
export async function updateOemScheduleItem(id: string, item: Partial<OemScheduleItem>): Promise<OemScheduleItem> {
  const res = await authenticatedFetch(`/api/oem-schedule/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error("Не удалось обновить пункт регламента");
  return res.json();
}

export async function saveOemScheduleItems(vehicleId: string, items: Partial<OemScheduleItem>[]): Promise<OemScheduleItem[]> {
  const res = await authenticatedFetch("/api/oem-schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId, items }),
  });
  if (!res.ok) throw new Error("Не удалось сохранить регламент");
  return res.json();
}

// Aggregated Stats
export async function fetchVehicleStats(vehicleId: string): Promise<VehicleStats> {
  const res = await authenticatedFetch(`/api/stats/${vehicleId}`);
  if (!res.ok) throw new Error("Не удалось загрузить аналитику");
  return res.json();
}

export type GarageAiAgentName = "architect" | "developer" | "qa" | "ops" | "argon_reviewer";

export interface GarageAiAgentRunResult {
  task: string;
  results: Record<string, string>;
}

export async function runGarageAiAgents(payload: {
  task: string;
  agents?: GarageAiAgentName[];
}): Promise<GarageAiAgentRunResult> {
  const res = await authenticatedFetch("/api/agents/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Не удалось запустить AI-агентов",
    );
  }
  if (
    !data ||
    typeof data.task !== "string" ||
    !data.results ||
    typeof data.results !== "object" ||
    Array.isArray(data.results) ||
    Object.values(data.results).some((value) => typeof value !== "string")
  ) {
    throw new Error("Сервис AI-агентов вернул некорректный ответ");
  }
  return data as GarageAiAgentRunResult;
}

// AI APIs
export async function requestAiDiagnosis(payload: {
  vehicle: Vehicle;
  problemDescription: string;
  userNotes?: string;
  recentHistory?: string;
}): Promise<DiagnosticResult> {
  const res = await authenticatedFetch("/api/ai/diagnose", {
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
  const res = await authenticatedFetch("/api/ai/scan-receipt", {
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

export async function requestDocumentOcr(imageBase64: string, mimeType = "image/jpeg"): Promise<{ text: string; sources?: { vision: string | null; local: string; confidence: number }; preprocessing?: { variants: string[]; mimeType: string }; warning?: string | null }> {
  const res = await authenticatedFetch("/api/ai/scan-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не удалось распознать документ");
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
  const res = await authenticatedFetch("/api/ai/oem-schedule", {
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
  const res = await authenticatedFetch("/api/ai/part-lookup", {
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
  const res = await authenticatedFetch("/api/tuning", {
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
  const res = await authenticatedFetch(`/api/tuning/${encodeURIComponent(id)}`, {
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
  const res = await authenticatedFetch(`/api/tuning/${encodeURIComponent(id)}`, { method: "DELETE" });
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
  return authSessionActive;
}

export function adminLogout(): void {
  setAdminToken(null);
}

export async function verifyAdminPassword(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await authenticatedFetch("/api/admin/verify", {
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
  const res = await authenticatedFetch("/api/backup/reset", {
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
  const res = await authenticatedFetch("/api/backup/import", {
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
