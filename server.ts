import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { v1 as documentai } from "@google-cloud/documentai";
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
  ReminderRecord,
  ReminderKind,
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
import {
  prepareDocumentImage,
  prepareVisionDocumentTiles,
  recognizeDocumentImage,
  normalizeExtractedVin,
  normalizeRussianPlate,
} from "./server/documentOcr";
import { GarageStore, UserAlreadyExistsError, emptyGarage, type GarageData, type EmailAuthChallengeRecord } from "./server/store";
import { ConcurrentGarageUpdateError, PostgresPersistence } from "./server/postgresPersistence";
import { hasAiConfiguration, hasGeminiConfiguration } from "./server/aiConfig";
import { AgentServiceClientError, runAgentService } from "./server/agentServiceClient";
import { assertProductionStorageSafe } from "./server/storageSafety";
import { validateGarageBackup } from "./server/backup";
import { generateEmailCode, hashEmailCode, normalizeEmail } from "./server/emailCodeAuth";
import { safeHttpErrorResponse } from "./server/httpErrorResponse";
import { classifyReceiptText } from "./server/receiptClassification";
import {
  SESSION_RENEW_THRESHOLD_MS,
  SESSION_TTL_MS,
  createSession,
  hashPassword,
  hashToken,
  newId,
  verifyCsrf,
  verifyPassword,
  type SessionRecord,
} from "./server/security";
import {
  asNonNegativeNumber,
  asTrimmedString,
  isValidDate,
  isValidYear,
  validateCredentials,
  validateDiagnosticResult,
} from "./server/validation";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const PAID_VISION_MODEL = "google/gemini-2.5-flash";
function resolveVisionModel(value: string | undefined): string {
  const model = value?.trim();
  return !model || model === "openrouter/free" || model.endsWith(":free") ? PAID_VISION_MODEL : model;
}
const OPENROUTER_MODEL = resolveVisionModel(process.env.OPENROUTER_MODEL);
const OPENROUTER_RECEIPT_MODEL = resolveVisionModel(process.env.OPENROUTER_RECEIPT_MODEL || OPENROUTER_MODEL);
const OPENROUTER_DOCUMENT_MODEL = resolveVisionModel(process.env.OPENROUTER_DOCUMENT_MODEL || OPENROUTER_MODEL);
const OPENROUTER_DOCUMENT_REFINEMENT_ENABLED = process.env.OPENROUTER_DOCUMENT_REFINEMENT_ENABLED === "true";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
let documentAiClient: documentai.DocumentProcessorServiceClient | null = null;
function getDocumentAiClient() {
  if (!documentAiClient) {
    const location = process.env.DOCUMENT_AI_LOCATION || "us";
    documentAiClient = new documentai.DocumentProcessorServiceClient({ apiEndpoint: `${location}-documentai.googleapis.com` });
  }
  return documentAiClient;
}
function documentProcessorName(id: string) {
  return `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/${process.env.DOCUMENT_AI_LOCATION || "us"}/processors/${id}`;
}
function documentEntityValue(entities: Array<{ type?: string; mentionText?: string; normalizedValue?: { text?: string; moneyValue?: { currencyCode?: string; units?: string; nanos?: number } } }>, types: string[]) {
  const entity = entities.find(item => types.some(type => (item.type || "").toLowerCase().includes(type)));
  return entity?.normalizedValue?.text || entity?.mentionText || null;
}
async function processWithDocumentAi(content: Buffer, mimeType: string, processorId: string) {
  const [result] = await getDocumentAiClient().processDocument({
    name: documentProcessorName(processorId),
    rawDocument: { content, mimeType },
  });
  return result.document;
}

app.set("trust proxy", 1);

// Middleware for parsing JSON with a 10mb limit for receipt photos
app.use(express.json({ limit: "10mb" }));

const ALLOWED_ORIGIN_HOSTS = new Set(
  (process.env.ALLOWED_ORIGINS || "https://garageai.site,https://www.garageai.site,http://localhost:3000,http://localhost:8080")
    .split(",")
    .map((item) => {
      try {
        return new URL(item.trim()).host;
      } catch {
        return item.trim();
      }
    })
    .filter(Boolean)
);

// Защита от клиентских подделок Origin на state-changing запросах с поддержкой reverse-proxy.
app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const origin = req.headers.origin;
  if (typeof origin === "string") {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return res.status(403).json({ error: "Некорректный Origin" });
    }
    const forwardedHost =
      typeof req.headers["x-forwarded-host"] === "string"
        ? req.headers["x-forwarded-host"].split(",")[0].trim()
        : undefined;
    const hostMatches =
      originHost === req.headers.host ||
      (forwardedHost !== undefined && originHost === forwardedHost) ||
      ALLOWED_ORIGIN_HOSTS.has(originHost);
    if (!hostMatches) {
      return res.status(403).json({ error: "Запрос отклонён: несовпадение origin" });
    }
  }
  return next();
});

// Serve static assets from /public directory (e.g. 3D models in /models/*.glb)
const PUBLIC_DIR = path.join(process.cwd(), "public");
app.use(express.static(PUBLIC_DIR));
app.use("/models", express.static(path.join(PUBLIC_DIR, "models")));

// ---------------------------------------------------------------------------
// Database Storage Engine (JSON file persistence with atomic write)
// ---------------------------------------------------------------------------

interface GarageDatabase {
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

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = process.env.GARAGE_SESSIONS_FILE
  ? path.resolve(process.env.GARAGE_SESSIONS_FILE)
  : path.join(DATA_DIR, "sessions.json");
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
  const candidate = typeof preferred === "string" && preferred.trim() ? preferred.trim() : newId(prefix);
  return existing.some((item) => item.id === candidate) ? newId(prefix) : candidate;
}

function getInitialDatabase(): GarageDatabase {
  return {
    vehicles: clone(INITIAL_VEHICLES),
    reminders: [],
    serviceRecords: clone(INITIAL_SERVICE_RECORDS),
    fuelRecords: clone(INITIAL_FUEL_RECORDS),
    oemSchedules: clone(INITIAL_OEM_SCHEDULES),
    garageParts: clone(INITIAL_GARAGE_PARTS),
    toFixTasks: clone(INITIAL_TO_FIX_TASKS),
    tuningStages: clone(INITIAL_TUNING_STAGES),
    lastUpdated: new Date().toISOString(),
  };
}

function isSafeAssetUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 5_000_000) return false;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(trimmed)
  );
}

// Refuse accidental production deployment while the backend still uses local JSON files.
assertProductionStorageSafe(process.env);

// PostgreSQL is selected only when explicitly configured; local development keeps JSON storage.
const store = process.env.DATABASE_URL?.trim()
  ? new PostgresPersistence({
      connectionString: process.env.DATABASE_URL,
      maxConnections: Number(process.env.DATABASE_POOL_MAX) || 5,
      ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
      runMigrations: process.env.NODE_ENV !== "production" || process.env.DATABASE_AUTO_MIGRATE === "true",
    })
  : new GarageStore(DB_FILE, () => getInitialDatabase());

// Текущий пользователь определяется в requireAuth и кладётся в контекст запроса.
// Обращения во всех маршрутах идут через dbMemory, который проксирует в данные
// текущего пользователя, поэтому доступ к чужому гаражу невозможен по построению.
// AsyncLocalStorage исключает смешивание данных между параллельными запросами.
interface RequestContext {
  userId: string;
  garage: GarageData;
  session: SessionRecord;
  revision?: number;
  response: express.Response;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

// Serialize same-user writes so concurrent requests cannot overwrite a newer garage snapshot.
const pendingUserWrites = new Map<string, Promise<void>>();

function currentContext(): RequestContext {
  const context = requestContext.getStore();
  if (!context) throw new Error("Нет активной сессии для доступа к данным гаража");
  return context;
}

const dbMemory = new Proxy({} as GarageDatabase, {
  get(_target, property: string) {
    return (currentContext().garage as unknown as Record<string, unknown>)[property];
  },
  set(_target, property: string, value: unknown) {
    (currentContext().garage as unknown as Record<string, unknown>)[property] = value;
    return true;
  },
  ownKeys() {
    return ["vehicles", "reminders", "serviceRecords", "fuelRecords", "oemSchedules", "garageParts", "toFixTasks", "tuningStages", "lastUpdated"];
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});

async function saveDatabase(): Promise<boolean> {
  const context = requestContext.getStore();
  if (!context) return true;
  try {
    if (store instanceof PostgresPersistence) {
      const revision = context.revision ?? 0;
      const result = await store.commitGarageVersioned(context.userId, context.garage, revision);
      context.garage = result.garage;
      context.revision = result.revision;
      return true;
    }
    await store.schedulePersist(context.userId, context.garage);
    return true;
  } catch (error) {
    if (error instanceof ConcurrentGarageUpdateError) {
      if (!context.response.headersSent) context.response.status(409).json({ error: "Данные гаража изменились в другом запросе. Обновите данные и повторите попытку." });
      return false;
    }
    console.error("Garage persistence failed:", error instanceof Error ? error.message : "unknown error");
    if (!context.response.headersSent) context.response.status(503).json({ error: "Не удалось сохранить данные гаража. Повторите попытку позже." });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Google GenAI Lazy Initialization
// ---------------------------------------------------------------------------

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || "";
    const useVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
    aiClient = useVertex
      ? new GoogleGenAI({
          vertexai: true,
          project: process.env.GOOGLE_CLOUD_PROJECT,
          location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
        })
      : new GoogleGenAI({
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

type OpenRouterPurpose = "receipt" | "document";

function getOpenRouterConfig(purpose: OpenRouterPurpose = "receipt") {
  const key = purpose === "document"
    ? process.env.OPENROUTER_DOCUMENT_API_KEY || process.env.OPENROUTER_API_KEY
    : process.env.OPENROUTER_RECEIPT_API_KEY || process.env.OPENROUTER_API_KEY;
  const model = purpose === "document" ? OPENROUTER_DOCUMENT_MODEL : OPENROUTER_RECEIPT_MODEL;
  return { key, model };
}

async function requestOpenRouter(body: Record<string, unknown>, title: string, key: string) {
  const maxAttempts = 3;
  let currentBody: Record<string, unknown> = { ...body };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        signal: AbortSignal.timeout(45_000),
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "https://garageai.site",
          "X-Title": title,
        },
        body: JSON.stringify(currentBody),
      });

      let payload = await response.json().catch(() => ({}));

      // Если модель не поддерживает response_format: json_object — повторяем без него
      if (!response.ok && response.status === 400 && currentBody.response_format) {
        const { response_format: _ignored, ...fallbackBody } = currentBody;
        currentBody = fallbackBody;
        const retryResponse = await fetch(OPENROUTER_URL, {
          signal: AbortSignal.timeout(45_000),
          method: "POST",
          headers: {
            Authorization: "Bearer " + key,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.APP_URL || "https://garageai.site",
            "X-Title": title,
          },
          body: JSON.stringify(currentBody),
        });
        payload = await retryResponse.json().catch(() => ({}));
        if (retryResponse.ok) return payload;
      }

      if (response.ok) {
        return payload;
      }

      const status = response.status;
      const errMsg = payload?.error?.message || `OpenRouter request failed (${status})`;
      lastError = new Error(errMsg);

      // Повторяем при 408, 429 и 5xx ошибках провайдера
      if ((status === 408 || status === 429 || status >= 500) && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }
      throw lastError;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isNetworkOrTimeout =
        lastError.message.includes("fetch failed") ||
        lastError.message.includes("timeout") ||
        lastError.message.includes("aborted") ||
        lastError.message.includes("ECONNRESET") ||
        lastError.message.includes("socket");
      if (isNetworkOrTimeout && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError || new Error("OpenRouter request failed after retries");
}

async function requestOpenRouterVision(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  purpose: OpenRouterPurpose = "receipt"
): Promise<string> {
  const { key, model } = getOpenRouterConfig(purpose);
  if (!key) throw new Error("OpenRouter API key is not configured");

  let imageContents: Array<Record<string, unknown>>;
  if (purpose === "document") {
    const rawBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const inputBuffer = Buffer.from(rawBase64, "base64");
    const tiles = await prepareVisionDocumentTiles(inputBuffer);
    imageContents = tiles.map((tile) => ({
      type: "image_url",
      image_url: { url: `data:${tile.mimeType};base64,${tile.base64}` },
    }));
  } else {
    const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : "data:" + mimeType + ";base64," + imageBase64;
    imageContents = [{ type: "image_url", image_url: { url: imageUrl } }];
  }

  const payload = await requestOpenRouter(
    {
      model,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...imageContents] }],
      temperature: 0,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    },
    "Garage AI",
    key
  );
  const content = payload?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) return content.map((part: any) => part?.text || "").join("");
  if (typeof content !== "string") throw new Error("OpenRouter returned an empty response");
  return content;
}

async function requestOpenRouterDocumentText(imageBase64: string, mimeType: string): Promise<string> {
  const { key, model } = getOpenRouterConfig("document");
  if (!key) throw new Error("Document OpenRouter API key is not configured");

  const rawBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
  const inputBuffer = Buffer.from(rawBase64, "base64");
  const tiles = await prepareVisionDocumentTiles(inputBuffer);

  const imageParts = tiles.map((tile) => ({
    type: "image_url",
    image_url: { url: `data:${tile.mimeType};base64,${tile.base64}` },
  }));

  const promptText =
    tiles.length > 1
      ? "You are a high-precision document OCR engine. You are given the full document page followed by zoomed-in top and bottom crops of the same page to read small or faint print. Transcribe EVERY visible word, printed form field label (even if the field is blank), table column header, cell value, checkbox label, header, footer, margin number, stamp, and handwritten annotation in natural top-to-bottom reading order. Preserve exact spelling, casing, numbers, and punctuation. Do not repeat lines from the overlapping region, and do not summarize, translate, or omit anything. Return only the raw plain text transcription."
      : "You are a high-precision document OCR engine. Transcribe EVERY visible word, printed form field label, table header, cell value, header, footer, margin code, stamp, and handwritten annotation in natural reading order. Preserve exact spelling, numbers, punctuation and line breaks. Do not summarize, translate, or omit anything. Return only the plain text transcription.";

  const payload = await requestOpenRouter(
    {
      model,
      messages: [{ role: "user", content: [{ type: "text", text: promptText }, ...imageParts] }],
      temperature: 0,
      max_tokens: 8192,
    },
    "Garage AI OCR",
    key
  );
  const content = payload?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) return content.map((part: any) => part?.text || "").join("");
  if (typeof content !== "string") throw new Error("Document OCR returned an empty response");
  return content.trim();
}

async function requestOpenRouterReceiptFields(ocrText: string): Promise<Record<string, any>> {
  const { key, model } = getOpenRouterConfig("receipt");
  if (!key) throw new Error("Receipt OpenRouter API key is not configured");
  const safeOcrText = ocrText.slice(0, 12000);
  const payload = await requestOpenRouter(
    {
      model,
      messages: [
        {
          role: "user",
          content: `Извлеки поля чека только из приведенного OCR-текста. Не угадывай отсутствующие значения. Для даты используй формат YYYY-MM-DD; сумма должна быть итогом к оплате, не наличными или сдачей. Верни JSON: {"merchantName": string|null, "date": string|null, "totalAmount": number|null, "currency": string|null, "category": "repair"|"fuel"|"parts"|"wash"|"tires"|"tuning"|"other", "description": string, "notes": string|null}. OCR-текст:\n${safeOcrText}`,
        },
      ],
      temperature: 0,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    },
    "Garage AI Receipt Parser",
    key
  );
  const content = payload?.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map((part: any) => part?.text || "").join("") : content;
  if (typeof text !== "string") throw new Error("Receipt parser returned an empty response");
  return parseJsonSafely(text, {});
}

async function requestOpenRouterDocumentRefinement(ocrText: string): Promise<string> {
  const { key, model } = getOpenRouterConfig("document");
  if (!key) throw new Error("Document OpenRouter API key is not configured");
  const payload = await requestOpenRouter(
    {
      model,
      messages: [
        {
          role: "user",
          content: `Исправь только очевидные OCR-ошибки в распознанном тексте документа. Не добавляй догадки, не меняй имена, даты, номера и суммы без явного основания. Сохрани порядок и строки. Верни только исправленный текст.\n\n${ocrText.slice(0, 15000)}`,
        },
      ],
      temperature: 0,
      max_tokens: 8192,
    },
    "Garage AI Document OCR",
    key
  );
  const content = payload?.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map((part: any) => part?.text || "").join("") : content;
  if (typeof text !== "string" || !text.trim()) throw new Error("Document refiner returned an empty response");
  return text.trim();
}

function mergeOcrText(...texts: string[]) {
  const valid = texts.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean);
  if (valid.length === 0) return "";
  if (valid.length === 1) return valid[0];

  const primaryLines = valid[0].split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const normalizeLine = (line: string) => line.toLowerCase().replace(/[^0-9a-zа-яё]+/gi, "");
  const seenNormalized = new Set(primaryLines.map(normalizeLine).filter(Boolean));
  const seenWords = new Set(
    valid[0]
      .toLowerCase()
      .split(/[^0-9a-zа-яё]+/i)
      .filter((w) => w.length >= 2)
  );

  const extraLines: string[] = [];
  for (const secondary of valid.slice(1)) {
    for (const rawLine of secondary.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const norm = normalizeLine(line);
      if (!norm || seenNormalized.has(norm)) continue;

      const words = line
        .toLowerCase()
        .split(/[^0-9a-zа-яё]+/i)
        .filter((w) => w.length >= 2);
      const newWordsCount = words.filter((w) => !seenWords.has(w)).length;
      if (newWordsCount > 0) {
        seenNormalized.add(norm);
        words.forEach((w) => seenWords.add(w));
        extraLines.push(line);
      }
    }
  }

  return extraLines.length > 0 ? [...primaryLines, ...extraLines].join("\n") : primaryLines.join("\n");
}

function parseJsonSafely<T = any>(text: string | undefined | null, fallback: T): T {
  if (!text) return fallback;
  const cleaned = text
    .trim()
    .replace(/^\`\`\`(?:json)?\s*/i, "")
    .replace(/\s*\`\`\`$/i, "")
    .trim();

  const tryParse = (candidate: string): T | undefined => {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      try {
        // Чиним висящие запятые и неэкранированные переносы строк внутри JSON
        const sanitized = candidate
          .replace(/,\s*([}\]])/g, "$1")
          .replace(/[\u0000-\u0019]+/g, " ");
        return JSON.parse(sanitized) as T;
      } catch {
        return undefined;
      }
    }
  };

  const direct = tryParse(cleaned);
  if (direct !== undefined) return direct;

  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (match) {
    const extracted = tryParse(match[0]);
    if (extracted !== undefined) return extracted;
  }

  // Если длинный JSON обрезался по лимиту токенов — пытаемся закрыть открытую строку и объект
  if (cleaned.startsWith("{") && !cleaned.endsWith("}")) {
    for (const suffix of ['"}', 'null}', '"]}']) {
      const repaired = tryParse(cleaned + suffix);
      if (repaired !== undefined) return repaired;
    }
  }

  return fallback;
}

// ---------------------------------------------------------------------------
// REST API Routes
// ---------------------------------------------------------------------------

// Каталог и поиск по нему — общие справочные данные, они не содержат
// пользовательских данных и остаются доступными без входа.
const PUBLIC_ROUTES = new Set(["/health", "/vehicles/brands", "/catalog/meta", "/auth/session"]);

// Всё остальное требует действующей сессии владельца гаража.
app.use("/api", (req, res, next) => {
  const fullPath = req.path.replace(/^\//, "");
  const isPublic =
    PUBLIC_ROUTES.has(req.path) ||
    req.path.startsWith("/vehicles/brands/") ||
    req.path.startsWith("/vehicles/models/") ||
    req.path.startsWith("/vehicles/generations/") ||
    req.path === "/vehicles/search" ||
    req.path === "/vehicles/top100" ||
    req.path.startsWith("/catalog/modifications/") ||
    req.path === "/knowledge/search" ||
    req.path === "/auth/register" ||
    req.path === "/auth/login" ||
    req.path === "/auth/logout" ||
    req.path.startsWith("/auth/session");
  if (isPublic) return next();
  if (req.path === "/health" || !fullPath) return next();
  return requireAuth(req, res, next);
});

// 1. Health and Meta Check
app.get("/api/health", async (_req, res) => {
  const garage = requestContext.getStore()?.garage;
  if (store instanceof PostgresPersistence) {
    try {
      await store.healthCheck();
    } catch {
      return res.status(503).json({ status: "degraded", storageProvider: "postgresql", timestamp: new Date().toISOString() });
    }
  }
  res.json({
    status: "ok",
    storageProvider: store instanceof PostgresPersistence ? "postgresql" : "local-json",
    // Keep the legacy field for older clients, but expose explicit provider
    // state so Vertex AI/ADC is not misreported as a missing API key.
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    hasAiConfigured: hasAiConfiguration(process.env),
    hasGeminiConfigured: hasGeminiConfiguration(process.env),
    vertexAiEnabled: process.env.GOOGLE_GENAI_USE_VERTEXAI === "true",
    authenticated: Boolean(garage),
    vehiclesCount: garage ? dbMemory.vehicles.length : 0,
    serviceRecordsCount: garage ? dbMemory.serviceRecords.length : 0,
    fuelRecordsCount: garage ? dbMemory.fuelRecords.length : 0,
    partsCount: garage ? dbMemory.garageParts.length : 0,
    toFixCount: garage ? dbMemory.toFixTasks.length : 0,
    lastUpdated: garage ? dbMemory.lastUpdated : null,
    timestamp: new Date().toISOString(),
  });
});

// 2. Complete State Sync
app.get("/api/data", (_req, res) => {
  res.json({
    vehicles: dbMemory.vehicles,
    reminders: dbMemory.reminders,
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

// ---------------------------------------------------------------------------
// Reminders API (ОСАГО / КАСКО / налог)
// ---------------------------------------------------------------------------

const VALID_REMINDER_KINDS = new Set<ReminderKind>(["osago", "kasko", "tax"]);

function normalizeReminder(body: Partial<ReminderRecord>): { value?: ReminderRecord; error?: string } {
  const kind = body.kind;
  if (kind === undefined || !VALID_REMINDER_KINDS.has(kind)) return { error: "Некорректный тип напоминания" };
  if (typeof body.vehicleId !== "string" || !body.vehicleId.trim()) return { error: "vehicleId обязателен" };
  if (typeof body.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate) || Number.isNaN(Date.parse(body.startDate))) {
    return { error: "startDate должен быть датой в формате YYYY-MM-DD" };
  }
  if (!dbMemory.vehicles.some((vehicle) => vehicle.id === body.vehicleId)) {
    return { error: "Автомобиль не найден" };
  }
  if (body.durationMonths !== undefined && (!Number.isInteger(Number(body.durationMonths)) || Number(body.durationMonths) < 1 || Number(body.durationMonths) > 60)) {
    return { error: "durationMonths должен быть целым числом от 1 до 60" };
  }
  if (body.price !== undefined && (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) {
    return { error: "price должен быть неотрицательным числом" };
  }
  return {
    value: {
      id: body.id || `reminder-${Date.now()}`,
      vehicleId: body.vehicleId,
      kind,
      startDate: body.startDate,
      durationMonths: body.durationMonths === undefined ? undefined : Number(body.durationMonths),
      price: body.price === undefined ? undefined : Number(body.price),
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : undefined,
    },
  };
}

app.get("/api/reminders", (_req, res) => {
  res.json(dbMemory.reminders);
});

app.post("/api/reminders", async (req, res) => {
  const { value, error } = normalizeReminder(req.body || {});
  if (error) return res.status(400).json({ error });
  if (!value) return res.status(400).json({ error: "Некорректное напоминание" });
  const reminder = { ...value, id: uniqueId(value.id, "reminder", dbMemory.reminders) };
  dbMemory.reminders.push(reminder);
  if (!(await saveDatabase())) return;
  res.status(201).json(reminder);
});

app.put("/api/reminders/:id", async (req, res) => {
  const index = dbMemory.reminders.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Напоминание не найдено" });
  const { value, error } = normalizeReminder({ ...req.body, id: req.params.id });
  if (error) return res.status(400).json({ error });
  dbMemory.reminders[index] = value as ReminderRecord;
  if (!(await saveDatabase())) return;
  res.json(dbMemory.reminders[index]);
});

app.delete("/api/reminders/:id", async (req, res) => {
  const len = dbMemory.reminders.length;
  dbMemory.reminders = dbMemory.reminders.filter((item) => item.id !== req.params.id);
  if (dbMemory.reminders.length === len) return res.status(404).json({ error: "Напоминание не найдено" });
  if (!(await saveDatabase())) return;
  res.json({ success: true });
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

app.post("/api/vehicles", async (req, res) => {
  const body = req.body as Partial<Vehicle>;
  if (typeof body.make !== "string" || !body.make.trim() || typeof body.model !== "string" || !body.model.trim()) {
    return res.status(400).json({ error: "Марка и модель обязательны для заполнения" });
  }
  if (body.bodyType !== undefined && !VALID_BODY_TYPES.has(body.bodyType)) {
    return res.status(400).json({ error: "Некорректный тип кузова" });
  }
  if (body.year !== undefined && (!Number.isInteger(Number(body.year)) || Number(body.year) < 1886 || Number(body.year) > new Date().getFullYear() + 1)) {
    return res.status(400).json({ error: "Некорректный год выпуска" });
  }
  if (body.currentMileage !== undefined && (!Number.isFinite(Number(body.currentMileage)) || Number(body.currentMileage) < 0)) {
    return res.status(400).json({ error: "Некорректный пробег" });
  }

  const colorHex =
    typeof body.colorHex === "string" && /^#[0-9a-f]{6}$/i.test(body.colorHex)
      ? body.colorHex
      : "#2563eb";
  if (body.photoUrl !== undefined && body.photoUrl !== "" && !isSafeAssetUrl(body.photoUrl)) {
    return res.status(400).json({ error: "Некорректный URL фотографии автомобиля" });
  }
  if (body.model3dUrl !== undefined && body.model3dUrl !== "" && !isSafeAssetUrl(body.model3dUrl)) {
    return res.status(400).json({ error: "Некорректный URL 3D-модели" });
  }

  const newVehicle: Vehicle = {
    id: uniqueId(body.id, "car", dbMemory.vehicles),
    make: asTrimmedString(body.make, 100),
    model: asTrimmedString(body.model, 100),
    generation: asTrimmedString(body.generation, 100),
    year: Number(body.year) || new Date().getFullYear(),
    licensePlate: asTrimmedString(body.licensePlate, 32),
    vin: asTrimmedString(body.vin, 32),
    engine: asTrimmedString(body.engine, 100) || "Стандарт",
    fuelType: asTrimmedString(body.fuelType, 60) || "Бензин (АИ-95)",
    transmission: asTrimmedString(body.transmission, 60) || "Автомат",
    driveType: asTrimmedString(body.driveType, 60) || "Передний",
    currentMileage: Number(body.currentMileage) || 0,
    lastMileageUpdate: new Date().toLocaleDateString("ru-RU"),
    colorHex,
    bodyType: body.bodyType || "sedan",
    photoUrl: isSafeAssetUrl(body.photoUrl) ? body.photoUrl.trim() : undefined,
    model3dUrl: isSafeAssetUrl(body.model3dUrl) ? body.model3dUrl.trim() : undefined,
  };

  dbMemory.vehicles.push(newVehicle);
  if (!(await saveDatabase())) return;
  res.status(201).json(newVehicle);
});

app.put("/api/vehicles/:id", async (req, res) => {
  const index = dbMemory.vehicles.findIndex((v) => v.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Автомобиль не найден" });
  }

  const updates = (req.body || {}) as Partial<Vehicle>;
  if (updates.make !== undefined && (typeof updates.make !== "string" || !updates.make.trim())) {
    return res.status(400).json({ error: "Марка не может быть пустой" });
  }
  if (updates.model !== undefined && (typeof updates.model !== "string" || !updates.model.trim())) {
    return res.status(400).json({ error: "Модель не может быть пустой" });
  }
  if (updates.bodyType !== undefined && !VALID_BODY_TYPES.has(updates.bodyType)) {
    return res.status(400).json({ error: "Некорректный тип кузова" });
  }
  if (updates.year !== undefined && !isValidYear(updates.year)) {
    return res.status(400).json({ error: "Некорректный год выпуска" });
  }
  if (updates.currentMileage !== undefined && asNonNegativeNumber(updates.currentMileage) === null) {
    return res.status(400).json({ error: "Некорректный пробег" });
  }
  if (
    updates.colorHex !== undefined &&
    (typeof updates.colorHex !== "string" || !/^#[0-9a-f]{6}$/i.test(updates.colorHex))
  ) {
    return res.status(400).json({ error: "Некорректный цвет кузова" });
  }
  if (updates.photoUrl !== undefined && updates.photoUrl !== "" && !isSafeAssetUrl(updates.photoUrl)) {
    return res.status(400).json({ error: "Некорректный URL фотографии автомобиля" });
  }
  if (updates.model3dUrl !== undefined && updates.model3dUrl !== "" && !isSafeAssetUrl(updates.model3dUrl)) {
    return res.status(400).json({ error: "Некорректный URL 3D-модели" });
  }

  const current = dbMemory.vehicles[index];
  dbMemory.vehicles[index] = {
    ...current,
    make: updates.make !== undefined ? asTrimmedString(updates.make, 100) : current.make,
    model: updates.model !== undefined ? asTrimmedString(updates.model, 100) : current.model,
    generation: updates.generation !== undefined ? asTrimmedString(updates.generation, 100) : current.generation,
    year: updates.year !== undefined ? Number(updates.year) : current.year,
    licensePlate: updates.licensePlate !== undefined ? asTrimmedString(updates.licensePlate, 32) : current.licensePlate,
    vin: updates.vin !== undefined ? asTrimmedString(updates.vin, 32) : current.vin,
    engine: updates.engine !== undefined ? asTrimmedString(updates.engine, 100) : current.engine,
    fuelType: updates.fuelType !== undefined ? asTrimmedString(updates.fuelType, 60) : current.fuelType,
    transmission: updates.transmission !== undefined ? asTrimmedString(updates.transmission, 60) : current.transmission,
    driveType: updates.driveType !== undefined ? asTrimmedString(updates.driveType, 60) : current.driveType,
    currentMileage: updates.currentMileage !== undefined ? Number(updates.currentMileage) : current.currentMileage,
    colorHex: updates.colorHex !== undefined ? updates.colorHex : current.colorHex,
    bodyType: updates.bodyType !== undefined ? updates.bodyType : current.bodyType,
    photoUrl:
      updates.photoUrl === ""
        ? undefined
        : updates.photoUrl !== undefined
        ? updates.photoUrl.trim()
        : current.photoUrl,
    model3dUrl:
      updates.model3dUrl === ""
        ? undefined
        : updates.model3dUrl !== undefined
        ? updates.model3dUrl.trim()
        : current.model3dUrl,
    id: req.params.id,
  };

  if (!(await saveDatabase())) return;
  res.json(dbMemory.vehicles[index]);
});

app.patch("/api/vehicles/:id/mileage", async (req, res) => {
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
  if (!(await saveDatabase())) return;
  res.json(vehicle);
});

app.delete("/api/vehicles/:id", async (req, res) => {
  const id = req.params.id;
  const initialCount = dbMemory.vehicles.length;
  dbMemory.vehicles = dbMemory.vehicles.filter((v) => v.id !== id);

  if (dbMemory.vehicles.length === initialCount) {
    return res.status(404).json({ error: "Автомобиль не найден" });
  }

  // Also clean up linked records
  dbMemory.reminders = dbMemory.reminders.filter((r) => r.vehicleId !== id);
  dbMemory.serviceRecords = dbMemory.serviceRecords.filter((r) => r.vehicleId !== id);
  dbMemory.fuelRecords = dbMemory.fuelRecords.filter((r) => r.vehicleId !== id);
  dbMemory.oemSchedules = dbMemory.oemSchedules.filter((s) => s.vehicleId !== id);
  dbMemory.garageParts = dbMemory.garageParts.filter((p) => p.vehicleId !== id);
  dbMemory.toFixTasks = dbMemory.toFixTasks.filter((t) => t.vehicleId !== id);
  dbMemory.tuningStages = dbMemory.tuningStages.filter((t) => t.vehicleId !== id);

  if (!(await saveDatabase())) return;
  res.json({ success: true, message: "Автомобиль и связанные записи удалены" });
});

// ---------------------------------------------------------------------------
// Service Records API
// ---------------------------------------------------------------------------

app.get("/api/services", (req, res) => {
  const { vehicleId, category, search } = req.query;
  let list = [...dbMemory.serviceRecords];

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

app.post("/api/services", async (req, res) => {
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !Number.isFinite(Number(body.mileage)) || Number(body.mileage) < 0) {
    return res.status(400).json({ error: "Некорректная дата или пробег" });
  }

  const parts = Array.isArray(body.parts)
    ? body.parts.map((p, idx) => ({
        id: typeof p?.id === "string" && p.id.trim() ? p.id.trim() : `part-${Date.now()}-${idx}`,
        name: asTrimmedString(p?.name, 200),
        brand: asTrimmedString(p?.brand, 100),
        partNumber: asTrimmedString(p?.partNumber, 100),
        quantity: Math.max(1, Number(p?.quantity) || 1),
        unitPrice: Math.max(0, Number(p?.unitPrice) || 0),
      }))
    : [];
  const partsCost = parts.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  const laborCost = body.laborCost !== undefined ? Number(body.laborCost) : 0;
  const totalCost = body.totalCost !== undefined ? Number(body.totalCost) : laborCost + partsCost;
  if (![laborCost, totalCost, partsCost].every((value) => Number.isFinite(value) && value >= 0)) {
    return res.status(400).json({ error: "Стоимость должна быть неотрицательным числом" });
  }

  const newRecord: ServiceRecord = {
    id: uniqueId(body.id, "rec", dbMemory.serviceRecords),
    vehicleId: body.vehicleId.trim(),
    date: body.date.trim(),
    mileage: Number(body.mileage) || 0,
    category: body.category || "ТО и замена жидкостей",
    title: body.title.trim(),
    description: asTrimmedString(body.description, 2000),
    laborCost,
    parts,
    totalCost,
    serviceCenter: asTrimmedString(body.serviceCenter, 300),
    receiptImages: Array.isArray(body.receiptImages)
      ? body.receiptImages.filter((img): img is string => typeof img === "string")
      : [],
    notes: asTrimmedString(body.notes, 2000),
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

  // Mark garage parts installed if part numbers or installedPartIds match.
  const installedIds = new Set(
    Array.isArray(body.installedPartIds)
      ? body.installedPartIds.filter((id): id is string => typeof id === "string")
      : []
  );
  if (parts.length > 0 || installedIds.size > 0) {
    dbMemory.garageParts.forEach((gp) => {
      if (gp.status !== "in_stock") return;
      if (gp.vehicleId !== newRecord.vehicleId && gp.vehicleId !== "all") return;
      const gpNumber = (gp.partNumber || "").trim().toLowerCase();
      const matchedPart = parts.find(
        (p) =>
          (gpNumber !== "" && p.partNumber.toLowerCase() === gpNumber) ||
          installedIds.has(gp.id) ||
          p.id === `gp-${gp.id}`
      );
      if (matchedPart || installedIds.has(gp.id)) {
        const usedQty = matchedPart ? matchedPart.quantity : 1;
        if (gp.quantity > usedQty) {
          gp.quantity -= usedQty;
        } else {
          gp.quantity = 1;
          gp.status = "installed";
        }
      }
    });
  }

  if (!(await saveDatabase())) return;
  res.status(201).json(newRecord);
});

app.put("/api/services/:id", async (req, res) => {
  const index = dbMemory.serviceRecords.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Запись сервиса не найдена" });
  }

  // Валидация и белым списком разрешённые поля вместо слепого ...req.body
  const current = dbMemory.serviceRecords[index];
  const body = (req.body || {}) as Partial<ServiceRecord>;

  const parts = Array.isArray(body.parts)
    ? body.parts.map((p, i) => ({
        id: typeof p?.id === "string" ? p.id : `part-${Date.now()}-${i}`,
        name: typeof p?.name === "string" ? p.name : "",
        brand: typeof p?.brand === "string" ? p.brand : "",
        partNumber: typeof p?.partNumber === "string" ? p.partNumber : "",
        quantity: Number(p?.quantity) || 1,
        unitPrice: Number(p?.unitPrice) || 0,
      }))
    : current.parts;

  dbMemory.serviceRecords[index] = {
    ...current,
    vehicleId:
      typeof body.vehicleId === "string" && body.vehicleId.trim()
        ? body.vehicleId
        : current.vehicleId,
    date: typeof body.date === "string" && body.date.trim() ? body.date : current.date,
    mileage: body.mileage !== undefined ? Number(body.mileage) || 0 : current.mileage,
    category:
      typeof body.category === "string" && body.category.trim()
        ? (body.category as ServiceRecord["category"])
        : current.category,
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : current.title,
    description: typeof body.description === "string" ? body.description : current.description,
    laborCost: body.laborCost !== undefined ? Number(body.laborCost) || 0 : current.laborCost,
    parts,
    totalCost: body.totalCost !== undefined ? Number(body.totalCost) || 0 : current.totalCost,
    serviceCenter:
      typeof body.serviceCenter === "string" ? body.serviceCenter : current.serviceCenter,
    receiptImages: Array.isArray(body.receiptImages)
      ? body.receiptImages.map((img) => String(img))
      : current.receiptImages,
    notes: typeof body.notes === "string" ? body.notes : current.notes,
    id: req.params.id,
  };

  if (!(await saveDatabase())) return;
  res.json(dbMemory.serviceRecords[index]);
});

app.delete("/api/services/:id", async (req, res) => {
  const id = req.params.id;
  const initialLen = dbMemory.serviceRecords.length;
  dbMemory.serviceRecords = dbMemory.serviceRecords.filter((r) => r.id !== id);

  if (dbMemory.serviceRecords.length === initialLen) {
    return res.status(404).json({ error: "Запись сервиса не найдена" });
  }

  if (!(await saveDatabase())) return;
  res.json({ success: true, message: "Запись сервиса удалена" });
});

// ---------------------------------------------------------------------------
// Fuel Records API
// ---------------------------------------------------------------------------

app.get("/api/fuel", (req, res) => {
  const { vehicleId } = req.query;
  let list = [...dbMemory.fuelRecords];
  if (vehicleId && typeof vehicleId === "string") {
    list = list.filter((f) => f.vehicleId === vehicleId);
  }
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(list);
});

app.post("/api/fuel", async (req, res) => {
  const body = req.body as Partial<FuelRecord>;
  if (
    typeof body.vehicleId !== "string" ||
    !body.vehicleId.trim() ||
    typeof body.date !== "string" ||
    !isValidDate(body.date)
  ) {
    return res.status(400).json({ error: "vehicleId, корректная date (YYYY-MM-DD) и liters обязательны" });
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
    id: uniqueId(body.id, "fuel", dbMemory.fuelRecords),
    vehicleId: body.vehicleId,
    date: body.date.trim(),
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

  if (!(await saveDatabase())) return;
  res.status(201).json(newFuel);
});

app.delete("/api/fuel/:id", async (req, res) => {
  const id = req.params.id;
  const len = dbMemory.fuelRecords.length;
  dbMemory.fuelRecords = dbMemory.fuelRecords.filter((f) => f.id !== id);

  if (dbMemory.fuelRecords.length === len) {
    return res.status(404).json({ error: "Запись заправки не найдена" });
  }

  if (!(await saveDatabase())) return;
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

app.post("/api/inventory", async (req, res) => {
  const body = req.body as Partial<GaragePart>;
  if (typeof body.name !== "string" || !body.name.trim()) {
    return res.status(400).json({ error: "Название детали обязательно" });
  }

  const partNumber =
    typeof body.partNumber === "string" && body.partNumber.trim()
      ? body.partNumber.trim().toUpperCase()
      : `SKU-${Date.now().toString().slice(-6)}`;

  const newPart: GaragePart = {
    id: uniqueId(body.id, "gp", dbMemory.garageParts),
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
  if (!(await saveDatabase())) return;
  res.status(201).json(newPart);
});

app.put("/api/inventory/:id", async (req, res) => {
  const index = dbMemory.garageParts.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Деталь не найдена" });
  }

  // Валидация и белым списком разрешённые поля вместо слепого ...req.body
  const current = dbMemory.garageParts[index];
  const body = (req.body || {}) as Partial<GaragePart>;

  dbMemory.garageParts[index] = {
    ...current,
    vehicleId: typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId : current.vehicleId,
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : current.name,
    brand: typeof body.brand === "string" ? body.brand : current.brand,
    partNumber:
      typeof body.partNumber === "string" && body.partNumber.trim()
        ? body.partNumber.trim().toUpperCase()
        : current.partNumber,
    quantity: body.quantity !== undefined ? Math.max(0, Number(body.quantity) || 0) : current.quantity,
    purchasePrice: body.purchasePrice !== undefined ? Number(body.purchasePrice) || 0 : current.purchasePrice,
    purchaseDate: typeof body.purchaseDate === "string" ? body.purchaseDate : current.purchaseDate,
    location: typeof body.location === "string" ? body.location : current.location,
    status:
      body.status === "in_stock" || body.status === "installed" || body.status === "ordered"
        ? body.status
        : current.status,
    category:
      typeof body.category === "string" && body.category.trim()
        ? (body.category as GaragePart["category"])
        : current.category,
    id: req.params.id,
  };

  if (!(await saveDatabase())) return;
  res.json(dbMemory.garageParts[index]);
});

app.post("/api/inventory/:id/install", async (req, res) => {
  const part = dbMemory.garageParts.find((p) => p.id === req.params.id);
  if (!part) {
    return res.status(404).json({ error: "Деталь не найдена" });
  }

  part.status = "installed";
  if (!(await saveDatabase())) return;
  res.json({ success: true, part });
});

app.delete("/api/inventory/:id", async (req, res) => {
  const id = req.params.id;
  const len = dbMemory.garageParts.length;
  dbMemory.garageParts = dbMemory.garageParts.filter((p) => p.id !== id);

  if (dbMemory.garageParts.length === len) {
    return res.status(404).json({ error: "Деталь не найдена" });
  }

  if (!(await saveDatabase())) return;
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

app.post("/api/to-fix", async (req, res) => {
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
  if (!(await saveDatabase())) return;
  res.status(201).json(newTask);
});

app.put("/api/to-fix/:id", async (req, res) => {
  const index = dbMemory.toFixTasks.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Задача не найдена" });
  }

  // Валидация и белым списком разрешённые поля вместо слепого ...req.body
  const current = dbMemory.toFixTasks[index];
  const body = (req.body || {}) as Partial<ToFixTask>;

  dbMemory.toFixTasks[index] = {
    ...current,
    vehicleId: typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId : current.vehicleId,
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : current.title,
    priority:
      body.priority === "high" || body.priority === "medium" || body.priority === "low"
        ? body.priority
        : current.priority,
    estimatedCost: body.estimatedCost !== undefined ? Number(body.estimatedCost) || 0 : current.estimatedCost,
    targetMileage: body.targetMileage !== undefined ? Number(body.targetMileage) || undefined : current.targetMileage,
    category:
      typeof body.category === "string" && body.category.trim()
        ? (body.category as ToFixTask["category"])
        : current.category,
    description: typeof body.description === "string" ? body.description : current.description,
    linkedPartSku: typeof body.linkedPartSku === "string" ? body.linkedPartSku : current.linkedPartSku,
    dueDate: typeof body.dueDate === "string" ? body.dueDate : current.dueDate,
    workHint: typeof body.workHint === "string" ? body.workHint : current.workHint,
    status:
      body.status === "pending" || body.status === "in_progress" || body.status === "completed"
        ? body.status
        : current.status,
    id: req.params.id,
  };

  if (!(await saveDatabase())) return;
  res.json(dbMemory.toFixTasks[index]);
});

app.post("/api/to-fix/:id/complete", async (req, res) => {
  const task = dbMemory.toFixTasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Задача не найдена" });
  }

  task.status = "completed";
  if (!(await saveDatabase())) return;
  res.json({ success: true, task });
});

app.delete("/api/to-fix/:id", async (req, res) => {
  const id = req.params.id;
  const len = dbMemory.toFixTasks.length;
  dbMemory.toFixTasks = dbMemory.toFixTasks.filter((t) => t.id !== id);

  if (dbMemory.toFixTasks.length === len) {
    return res.status(404).json({ error: "Задача не найдена" });
  }

  if (!(await saveDatabase())) return;
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

app.post("/api/oem-schedule", async (req, res) => {
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
  if (!(await saveDatabase())) return;
  res.status(201).json(formatted);
});

app.put("/api/oem-schedule/:id", async (req, res) => {
  const index = dbMemory.oemSchedules.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Пункт регламента не найден" });
  }

  // Валидация и белым списком разрешённые поля вместо слепого ...req.body
  const current = dbMemory.oemSchedules[index];
  const body = (req.body || {}) as Partial<OemScheduleItem>;

  dbMemory.oemSchedules[index] = {
    ...current,
    vehicleId: typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId : current.vehicleId,
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : current.title,
    category: typeof body.category === "string" && body.category.trim() ? body.category : current.category,
    intervalKm: body.intervalKm !== undefined ? Number(body.intervalKm) || 0 : current.intervalKm,
    intervalMonths: body.intervalMonths !== undefined ? Number(body.intervalMonths) || 0 : current.intervalMonths,
    lastDoneKm: body.lastDoneKm !== undefined ? Number(body.lastDoneKm) || undefined : current.lastDoneKm,
    lastDoneDate: typeof body.lastDoneDate === "string" ? body.lastDoneDate : current.lastDoneDate,
    description: typeof body.description === "string" ? body.description : current.description,
    oemPartHint: typeof body.oemPartHint === "string" ? body.oemPartHint : current.oemPartHint,
    notes: typeof body.notes === "string" ? body.notes : current.notes,
    id: req.params.id,
  };

  if (!(await saveDatabase())) return;
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

app.post("/api/tuning", async (req, res) => {
  const body = req.body as Partial<TuningStage>;
  if (!body.vehicleId || !body.title) {
    return res.status(400).json({ error: "vehicleId и title обязательны" });
  }

  const newStage: TuningStage = {
    id: body.id || `ts-${Date.now()}`,
    vehicleId: body.vehicleId,
    title: body.title.trim(),
    stageName: body.stageName?.trim() || "",
    brand: body.brand?.trim() || "",
    sku: body.sku?.trim() || "",
    description: body.description?.trim() || "",
    status: body.status || "planned",
    estimatedBudget: Number(body.estimatedBudget) || 0,
    actualCost: Number(body.actualCost) || 0,
    parts: Array.isArray(body.parts) ? body.parts : [],
  };

  dbMemory.tuningStages.push(newStage);
  if (!(await saveDatabase())) return;
  res.status(201).json(newStage);
});

app.put("/api/tuning/:id", async (req, res) => {
  const index = dbMemory.tuningStages.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Тюнинг-этап не найден" });
  }

  // Валидация и белым списком разрешённые поля вместо слепого ...req.body
  const current = dbMemory.tuningStages[index];
  const body = (req.body || {}) as Partial<TuningStage>;

  dbMemory.tuningStages[index] = {
    ...current,
    vehicleId: typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId : current.vehicleId,
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : current.title,
    stageName: typeof body.stageName === "string" ? body.stageName : current.stageName,
    brand: typeof body.brand === "string" ? body.brand : current.brand,
    sku: typeof body.sku === "string" ? body.sku : current.sku,
    description: typeof body.description === "string" ? body.description : current.description,
    status:
      body.status === "planned" || body.status === "in_progress" || body.status === "completed"
        ? body.status
        : current.status,
    estimatedBudget: body.estimatedBudget !== undefined ? Number(body.estimatedBudget) || 0 : current.estimatedBudget,
    actualCost: body.actualCost !== undefined ? Number(body.actualCost) || 0 : current.actualCost,
    parts: Array.isArray(body.parts) ? body.parts : current.parts,
    id: req.params.id,
  };

  if (!(await saveDatabase())) return;
  res.json(dbMemory.tuningStages[index]);
});

app.delete("/api/tuning/:id", async (req, res) => {
  const id = req.params.id;
  const len = dbMemory.tuningStages.length;
  dbMemory.tuningStages = dbMemory.tuningStages.filter((t) => t.id !== id);

  if (dbMemory.tuningStages.length === len) {
    return res.status(404).json({ error: "Этап не найден" });
  }

  if (!(await saveDatabase())) return;
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
// User Authentication (server-side sessions, scrypt passwords, CSRF token)
// ---------------------------------------------------------------------------

const AI_RATE_LIMIT = 20;
const AI_RATE_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_CODE_LIMIT = 5;
const EMAIL_CODE_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFY_LIMIT = 10;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const aiRequestWindows = new Map<string, { count: number; startedAt: number }>();
const loginAttempts = new Map<string, { count: number; startedAt: number }>();
const emailCodeAttempts = new Map<string, { count: number; startedAt: number }>();
const sessions = new Map<string, SessionRecord>();
const SESSION_COOKIE = "garagehub_session";

function loadSessions(): void {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const parsed = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
    if (!Array.isArray(parsed)) return;
    const now = Date.now();
    for (const value of parsed) {
      if (!value || typeof value !== "object") continue;
      const record = value as Partial<SessionRecord>;
      if (
        typeof record.tokenHash !== "string" ||
        typeof record.csrfSecret !== "string" ||
        typeof record.userId !== "string" ||
        typeof record.createdAt !== "number" ||
        typeof record.expiresAt !== "number" ||
        record.expiresAt <= now
      ) continue;
      sessions.set(record.tokenHash, record as SessionRecord);
    }
  } catch (error) {
    console.error("Session storage initialization failed:", error);
  }
}

async function persistSessions(): Promise<void> {
  if (store instanceof PostgresPersistence) return;
  try {
    fs.mkdirSync(path.dirname(SESSIONS_FILE), { recursive: true });
    const now = Date.now();
    const active = [...sessions.values()].filter(
      (session) => session.expiresAt > now && !session.revokedAt,
    );
    const temporary = `${SESSIONS_FILE}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(active, null, 2), "utf-8");
    fs.renameSync(temporary, SESSIONS_FILE);
  } catch (error) {
    console.error("Session persistence failed:", error);
  }
}

if (!(store instanceof PostgresPersistence)) loadSessions();

// Периодическая очистка устаревших окон rate-limit, чтобы Map не росла бесконечно
// при работе сервера под нагрузкой с разных IP.
const rateLimitCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, window] of aiRequestWindows) {
    if (now - window.startedAt >= AI_RATE_WINDOW_MS) {
      aiRequestWindows.delete(key);
    }
  }
  for (const [key, attempt] of loginAttempts) {
    if (now - attempt.startedAt >= LOGIN_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
  for (const [key, attempt] of emailCodeAttempts) {
    if (now - attempt.startedAt >= EMAIL_CODE_WINDOW_MS) emailCodeAttempts.delete(key);
  }
  if (store instanceof PostgresPersistence) {
    void Promise.all([
      store.deleteExpiredSessions(now),
      store.deleteOldRateLimits(now),
    ]).catch((error) => {
      console.error("PostgreSQL cleanup failed:", error instanceof Error ? error.message : "unknown error");
    });
  } else {
    for (const [key, session] of sessions) {
      if (session.expiresAt <= now || (session.revokedAt && session.revokedAt <= now)) {
        sessions.delete(key);
      }
    }
    void persistSessions();
  }
}, RATE_LIMIT_CLEANUP_INTERVAL_MS);
// Не удерживаем процесс живым только ради очистки таймеров
rateLimitCleanupTimer.unref?.();

function parseCookies(header: string | undefined): Record<string, string> {
  const jar: Record<string, string> = {};
  if (!header) return jar;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) jar[key] = decodeURIComponent(value);
  }
  return jar;
}

function sessionCookie(token: string, maxAgeMs: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure}`;
}

function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

async function getSession(req: express.Request): Promise<SessionRecord | null> {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = hashToken(token);
  const record = store instanceof PostgresPersistence
    ? await store.getSession(tokenHash)
    : sessions.get(tokenHash);
  if (!record || record.revokedAt || record.expiresAt <= Date.now()) return null;
  return record;
}

/**
 * Обязательная аутентификация для всего доступа к данным гаража.
 * GET-запросы не требуют CSRF-токен, изменяющие — требуют.
 */
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    // Backup routes also declare requireAuth explicitly. Reuse the context created
    // by the global /api middleware rather than acquiring a second lock.
    if (requestContext.getStore()) return next();

    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: "Требуется вход в аккаунт" });
    const user = await store.getUserById(session.userId);
    if (!user) return res.status(401).json({ error: "Аккаунт не найден" });

    if (req.method !== "GET" && req.method !== "HEAD") {
      if (!verifyCsrf(session, req.headers["x-csrf-token"])) {
        return res.status(403).json({ error: "CSRF-токен недействителен" });
      }
    }

    const userId = session.userId;
    const runWithSnapshot = async () => {
      if (store instanceof PostgresPersistence) {
        const snapshot = await store.snapshotForUserWithRevision(userId, true);
        requestContext.run({ userId, garage: snapshot.garage, session, revision: snapshot.revision, response: res }, next);
      } else {
        const garage = await store.snapshotForUser(userId, true);
        requestContext.run({ userId, garage, session, response: res }, next);
      }
    };

    // Process-local serialization is an optimization only; PostgreSQL revision
    // checks remain the cross-instance concurrency boundary on Cloud Run.
    const method = req.method.toUpperCase();
    const pathname = req.originalUrl.split("?")[0];
    const garageWritePrefixes = [
      "/api/vehicles", "/api/reminders", "/api/services", "/api/fuel",
      "/api/inventory", "/api/to-fix", "/api/oem-schedule", "/api/tuning",
      "/api/backup/import", "/api/backup/reset",
    ];
    const isGarageWrite =
      ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
      garageWritePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));

    if (!isGarageWrite) {
      await runWithSnapshot();
      return;
    }

    const previous = pendingUserWrites.get(userId) ?? Promise.resolve();
    let unlockCurrent!: () => void;
    const current = new Promise<void>((resolve) => { unlockCurrent = resolve; });
    const queueEntry = previous.then(() => current);
    pendingUserWrites.set(userId, queueEntry);

    let releasing = false;
    const release = () => {
      if (releasing) return;
      releasing = true;
      void store.flush().catch((error) => {
        console.error("Ошибка ожидания записи перед следующим изменением гаража:", error instanceof Error ? error.message : "unknown error");
      }).finally(() => {
        unlockCurrent();
        if (pendingUserWrites.get(userId) === queueEntry) pendingUserWrites.delete(userId);
      });
    };

    void previous.then(async () => {
      if (res.destroyed || res.writableEnded) {
        release();
        return;
      }
      res.once("finish", release);
      res.once("close", release);
      await runWithSnapshot();
    }).catch((error) => {
      unlockCurrent();
      if (pendingUserWrites.get(userId) === queueEntry) pendingUserWrites.delete(userId);
      next(error);
    });
  } catch (error) {
    next(error);
  }
}

async function enforceAiRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = requestContext.getStore()?.userId;
  const clientId = userId ? `user:${userId}` : `ip:${req.ip || "unknown"}`;
  const now = Date.now();

  if (store instanceof PostgresPersistence) {
    try {
      const result = await store.consumeRateLimit("ai", hashToken(clientId), AI_RATE_LIMIT, AI_RATE_WINDOW_MS, now);
      if (!result.allowed) {
        res.setHeader("Retry-After", Math.max(1, Math.ceil(result.retryAfterMs / 1000)));
        return res.status(429).json({ error: "Слишком много AI-запросов. Повторите попытку позже." });
      }
      return next();
    } catch (error) {
      console.error("AI rate-limit storage failed:", error instanceof Error ? error.message : "unknown error");
      return res.status(503).json({ error: "AI-сервис временно недоступен." });
    }
  }

  const current = aiRequestWindows.get(clientId);
  const window = !current || now - current.startedAt >= AI_RATE_WINDOW_MS
    ? { count: 0, startedAt: now }
    : current;
  window.count += 1;
  aiRequestWindows.set(clientId, window);
  if (window.count > AI_RATE_LIMIT) {
    res.setHeader("Retry-After", Math.max(1, Math.ceil((window.startedAt + AI_RATE_WINDOW_MS - now) / 1000)));
    return res.status(429).json({ error: "Слишком много AI-запросов. Повторите попытку позже." });
  }
  return next();
}

function requireAiAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!hasAiConfiguration(process.env)) {
    return res.status(503).json({ error: "AI-функции не настроены на сервере." });
  }
  return enforceAiRateLimit(req, res, next);
}

function requireGeminiAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!hasGeminiConfiguration(process.env)) {
    return res.status(503).json({ error: "Для этой AI-функции требуется GEMINI_API_KEY или настройка Vertex AI." });
  }
  return enforceAiRateLimit(req, res, next);
}

// -------------------------------------------------------------------------
// Authentication API: register / login / logout / session
// ---------------------------------------------------------------------------

async function rateLimitedLogin(req: express.Request, res: express.Response): Promise<boolean> {
  const clientId = req.ip || "unknown";
  const now = Date.now();

  if (store instanceof PostgresPersistence) {
    try {
      const result = await store.consumeRateLimit("login", hashToken(clientId), LOGIN_LIMIT, LOGIN_WINDOW_MS, now);
      if (!result.allowed) {
        res.setHeader("Retry-After", Math.max(1, Math.ceil(result.retryAfterMs / 1000)));
        res.status(429).json({ error: "Слишком много попыток входа. Повторите позже." });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login rate-limit storage failed:", error instanceof Error ? error.message : "unknown error");
      res.status(503).json({ error: "Сервис входа временно недоступен." });
      return true;
    }
  }

  const window = loginAttempts.get(clientId);
  if (window && now - window.startedAt < LOGIN_WINDOW_MS && window.count >= LOGIN_LIMIT) {
    res.setHeader("Retry-After", Math.max(1, Math.ceil((window.startedAt + LOGIN_WINDOW_MS - now) / 1000)));
    res.status(429).json({ error: "Слишком много попыток входа. Повторите позже." });
    return true;
  }
  const current = window && now - window.startedAt < LOGIN_WINDOW_MS ? window : { count: 0, startedAt: now };
  current.count += 1;
  loginAttempts.set(clientId, current);
  return false;
}

async function clearLoginAttempts(clientId: string): Promise<void> {
  if (store instanceof PostgresPersistence) {
    try {
      await store.resetRateLimit("login", hashToken(clientId));
    } catch (error) {
      console.error("Login rate-limit reset failed:", error instanceof Error ? error.message : "unknown error");
    }
    return;
  }
  loginAttempts.delete(clientId);
}

async function establishSession(req: express.Request, res: express.Response, userId: string, username: string) {
  const { record, token } = createSession(userId);
  if (store instanceof PostgresPersistence) {
    await store.putSession(record);
  } else {
    sessions.set(record.tokenHash, record);
    await persistSessions();
  }
  res.setHeader("Set-Cookie", sessionCookie(token, SESSION_TTL_MS));
  return { username, csrfToken: record.csrfSecret };
}

app.post("/api/auth/register", async (req, res) => {
  if (await rateLimitedLogin(req, res)) return;
  const credentials = validateCredentials(req.body);
  if (credentials.error) return res.status(400).json({ error: credentials.error });
  try {
    if (await store.getUserByName(credentials.username!)) {
      return res.status(409).json({ error: "Пользователь с таким логином уже существует" });
    }
  } catch (error) {
    console.error("Registration lookup failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(503).json({ error: "Сервис регистрации временно недоступен." });
  }
  void (async () => {
    const userId = newId("user");
    const email = req.body?.email ? normalizeEmail(req.body.email) : null;
    if (req.body?.email && !email) { res.status(400).json({ error: "Введите корректный email" }); return; }
    if (email && (store instanceof PostgresPersistence ? await store.getUserByEmail(email) : store.getUserByEmail(email))) {
      res.status(409).json({ error: "Пользователь с таким email уже существует" }); return;
    }
    await store.createUser(credentials.username!, hashPassword(credentials.password!), userId, email ?? undefined);
    await clearLoginAttempts(req.ip || "unknown");
    res.status(201).json({ success: true, session: await establishSession(req, res, userId, credentials.username!) });
  })().catch((error) => {
    if (error instanceof UserAlreadyExistsError) {
      return res.status(409).json({ error: error.message });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Не удалось создать аккаунт" });
  });
});

app.post("/api/auth/login", async (req, res) => {
  if (await rateLimitedLogin(req, res)) return;
  const body = (req.body || {}) as Record<string, unknown>;
  const username = asTrimmedString(body.username, 32).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) {
    return res.status(400).json({ error: "Введите логин и пароль" });
  }
  let user;
  try {
    user = await store.getUserByName(username);
  } catch (error) {
    console.error("Login lookup failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(503).json({ error: "Сервис входа временно недоступен." });
  }
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Неверный логин или пароль" });
  }
  await clearLoginAttempts(req.ip || "unknown");
  try {
    res.json({ success: true, session: await establishSession(req, res, user.id, user.username) });
  } catch (error) {
    console.error("Session creation failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(503).json({ error: "Не удалось создать сессию. Повторите попытку." });
  }
});

async function consumeEmailCodeLimit(req: express.Request, email: string): Promise<boolean> {
  if (store instanceof PostgresPersistence) {
    try {
      const [ip, address] = await Promise.all([
        store.consumeRateLimit("email-code-ip", hashToken(req.ip || "unknown"), EMAIL_CODE_LIMIT, EMAIL_CODE_WINDOW_MS),
        store.consumeRateLimit("email-code-email", hashToken(email), EMAIL_CODE_LIMIT, EMAIL_CODE_WINDOW_MS),
      ]);
      return ip.allowed && address.allowed;
    } catch {
      return false;
    }
  }
  const now = Date.now();
  const keys = [`ip:${req.ip || "unknown"}`, `email:${email}`];
  for (const key of keys) {
    const current = emailCodeAttempts.get(key);
    if (current && now - current.startedAt < EMAIL_CODE_WINDOW_MS && current.count >= EMAIL_CODE_LIMIT) return false;
  }
  for (const key of keys) {
    const current = emailCodeAttempts.get(key);
    const window = !current || now - current.startedAt >= EMAIL_CODE_WINDOW_MS ? { count: 0, startedAt: now } : current;
    window.count += 1; emailCodeAttempts.set(key, window);
  }
  return true;
}

async function consumeEmailVerifyLimit(req: express.Request, email: string): Promise<boolean> {
  if (store instanceof PostgresPersistence) {
    try {
      const [ip, address] = await Promise.all([
        store.consumeRateLimit("email-verify-ip", hashToken(req.ip || "unknown"), EMAIL_VERIFY_LIMIT, EMAIL_CODE_WINDOW_MS),
        store.consumeRateLimit("email-verify-email", hashToken(email), EMAIL_VERIFY_LIMIT, EMAIL_CODE_WINDOW_MS),
      ]);
      return ip.allowed && address.allowed;
    } catch {
      return false;
    }
  }
  const now = Date.now();
  const keys = [`verify-ip:${req.ip || "unknown"}`, `verify-email:${email}`];
  for (const key of keys) {
    const current = emailCodeAttempts.get(key);
    if (current && now - current.startedAt < EMAIL_CODE_WINDOW_MS && current.count >= EMAIL_VERIFY_LIMIT) return false;
  }
  for (const key of keys) {
    const current = emailCodeAttempts.get(key);
    const window = !current || now - current.startedAt >= EMAIL_CODE_WINDOW_MS ? { count: 0, startedAt: now } : current;
    window.count += 1; emailCodeAttempts.set(key, window);
  }
  return true;
}

async function sendEmailCode(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Email provider is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Ваш код входа в GarageAI", text: `Код входа: ${code}. Он действует ${Math.floor(EMAIL_CODE_TTL_MS / 60000)} минут.` }),
  });
  if (!response.ok) throw new Error("Email provider rejected the request");
}

app.post(["/api/auth/email/request", "/api/auth/email/request-code"], async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: "Введите корректный email" });
  if (!(await consumeEmailCodeLimit(req, email))) {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({ error: "Слишком много запросов. Повторите позже." });
  }
  try {
    if (!process.env.RESEND_API_KEY?.trim() || !process.env.EMAIL_FROM?.trim()) {
      return res.status(503).json({ error: "Сервис отправки кода временно недоступен." });
    }
    const user = store instanceof PostgresPersistence ? await store.getUserByEmail(email) : store.getUserByEmail(email);
    if (user) {
      const id = newId("email-challenge");
      const code = generateEmailCode();
      const secret = process.env.EMAIL_CODE_SECRET?.trim();
      if (!secret) throw new Error("Email code secret is not configured");
      const record: EmailAuthChallengeRecord = { id, userId: user.id, codeHash: hashEmailCode(id, code, secret), expiresAtMs: Date.now() + EMAIL_CODE_TTL_MS, attempts: 0, createdAtMs: Date.now() };
      await sendEmailCode(email, code);
      await store.createEmailChallenge(record);
    }
    return res.json({ success: true, message: "Если аккаунт существует, код отправлен на email." });
  } catch (error) {
    console.error("Email code request failed");
    return res.status(503).json({ error: "Сервис отправки кода временно недоступен." });
  }
});

app.post(["/api/auth/email/verify", "/api/auth/email/verify-code"], async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ error: "Введите email и шестизначный код" });
  if (!(await consumeEmailVerifyLimit(req, email))) {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({ error: "Слишком много попыток. Повторите позже." });
  }
  try {
    const user = store instanceof PostgresPersistence ? await store.getUserByEmail(email) : store.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Неверный или просроченный код" });
    const secret = process.env.EMAIL_CODE_SECRET?.trim();
    if (!secret) return res.status(503).json({ error: "Сервис входа временно недоступен." });
    const accepted = await store.verifyEmailChallenge(user.id, code, secret);
    if (!accepted) {
      return res.status(401).json({ error: "Неверный или просроченный код" });
    }
    return res.json({ success: true, session: await establishSession(req, res, user.id, user.username) });
  } catch {
    return res.status(503).json({ error: "Сервис входа временно недоступен." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const session = await getSession(req);
    if (session) {
      if (store instanceof PostgresPersistence) await store.revokeSession(session.tokenHash, Date.now());
      else {
        session.revokedAt = Date.now();
        await persistSessions();
      }
    }
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.json({ success: true });
  } catch (error) {
    console.error("Logout failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(503).json({ error: "Не удалось завершить сессию. Повторите попытку." });
  }
});

app.get("/api/auth/session", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: "Сессия не найдена" });
    const user = await store.getUserById(session.userId);
    if (!user) return res.status(401).json({ error: "Аккаунт не найден" });

    // Скользящее продление сессии при активной работе.
    if (session.expiresAt - Date.now() < SESSION_RENEW_THRESHOLD_MS) {
      const token = crypto.randomBytes(32).toString("base64url");
      const previousHash = session.tokenHash;
      session.tokenHash = hashToken(token);
      session.expiresAt = Date.now() + SESSION_TTL_MS;
      session.csrfSecret = crypto.randomBytes(24).toString("base64url");
      if (store instanceof PostgresPersistence) {
        await store.rotateSession(previousHash, session, Date.now());
      } else {
        sessions.delete(previousHash);
        sessions.set(session.tokenHash, session);
        await persistSessions();
      }
      res.setHeader("Set-Cookie", sessionCookie(token, SESSION_TTL_MS));
    }
    return res.json({ username: user.username, csrfToken: session.csrfSecret });
  } catch (error) {
    console.error("Session lookup failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(503).json({ error: "Не удалось проверить сессию. Повторите попытку." });
  }
});

// Backup, Export, and Restore API (только для владельца гаража)
// ---------------------------------------------------------------------------

app.get("/api/backup/export", requireAuth, (req, res) => {
  const requestedVehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : null;
  const vehicleId = requestedVehicleId && dbMemory.vehicles.some((vehicle) => vehicle.id === requestedVehicleId) ? requestedVehicleId : null;
  const exported = vehicleId ? {
    ...dbMemory,
    vehicles: dbMemory.vehicles.filter((vehicle) => vehicle.id === vehicleId),
    reminders: dbMemory.reminders.filter((record) => record.vehicleId === vehicleId),
    serviceRecords: dbMemory.serviceRecords.filter((record) => record.vehicleId === vehicleId),
    fuelRecords: dbMemory.fuelRecords.filter((record) => record.vehicleId === vehicleId),
    oemSchedules: dbMemory.oemSchedules.filter((record) => record.vehicleId === vehicleId),
    garageParts: dbMemory.garageParts.filter((record) => record.vehicleId === vehicleId),
    toFixTasks: dbMemory.toFixTasks.filter((record) => record.vehicleId === vehicleId),
    tuningStages: dbMemory.tuningStages.filter((record) => record.vehicleId === vehicleId),
  } : dbMemory;
  res.setHeader("Content-Disposition", `attachment; filename="Garage AI_backup_${Date.now()}.json"`);
  res.setHeader("Content-Type", "application/json");
  res.json(exported);
});

app.post("/api/backup/import", requireAuth, async (req, res) => {
  try {
    const imported = { ...validateGarageBackup(req.body), lastUpdated: new Date().toISOString() };
    Object.assign(currentContext().garage, imported);

    if (!(await saveDatabase())) return;
    res.json({ success: true, message: "Данные успешно импортированы", counts: {
      vehicles: dbMemory.vehicles.length,
      services: dbMemory.serviceRecords.length,
    }});
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Ошибка импорта" });
  }
});

app.post("/api/backup/reset", requireAuth, async (_req, res) => {
  Object.assign(currentContext().garage, emptyGarage());
  if (!(await saveDatabase())) return;
  res.json({ success: true, message: "Данные текущего гаража очищены", data: dbMemory });
});

// ---------------------------------------------------------------------------
// AI Diagnostic & Gemini Endpoints
// ---------------------------------------------------------------------------

// Private ADK multi-agent orchestration proxy. Global /api auth and CSRF
// middleware protect this endpoint; Cloud Run IAM plus X-Agents-Token protect
// the upstream service.
const ALLOWED_AGENT_NAMES = new Set(["architect", "developer", "qa", "ops", "argon_reviewer"]);
const MAX_AGENTS_PER_RUN = 3;

async function requireAgentServiceAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    if (!process.env.AGENTS_SERVICE_URL?.trim() || !process.env.AGENTS_API_TOKEN?.trim()) {
      return res.status(503).json({ error: "AI-агенты не настроены на сервере." });
    }

    const session = await getSession(req);
    const user = session ? await store.getUserById(session.userId) : undefined;
    if (!user) return res.status(401).json({ error: "Требуется вход в аккаунт" });

    const allowlist = (process.env.AGENTS_ALLOWED_USERNAMES || "")
      .split(",")
      .map((username) => username.trim().toLowerCase())
      .filter(Boolean);
    if (process.env.NODE_ENV === "production" && allowlist.length === 0) {
      return res.status(503).json({ error: "Для AI-агентов не настроен allowlist администраторов." });
    }
    if (allowlist.length > 0 && !allowlist.includes(user.username.trim().toLowerCase())) {
      return res.status(403).json({ error: "Запуск AI-агентов разрешён только администратору проекта." });
    }

    return enforceAiRateLimit(req, res, next);
  } catch (error) {
    console.error("Agent authorization failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(503).json({ error: "Не удалось проверить доступ к AI-агентам." });
  }
}

app.post("/api/agents/run", requireAgentServiceAccess, async (req, res) => {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : {};
  const task = typeof body.task === "string" ? body.task.trim() : "";
  if (task.length < 3 || task.length > 8000) {
    return res.status(400).json({ error: "Задача должна содержать от 3 до 8000 символов." });
  }

  let agents: string[] | undefined;
  if (body.agents !== undefined) {
    if (
      !Array.isArray(body.agents) ||
      body.agents.length === 0 ||
      body.agents.length > MAX_AGENTS_PER_RUN ||
      body.agents.some((agent) => typeof agent !== "string" || !ALLOWED_AGENT_NAMES.has(agent)) ||
      new Set(body.agents).size !== body.agents.length
    ) {
      return res.status(400).json({ error: "Список AI-агентов содержит неизвестные или повторяющиеся значения." });
    }
    agents = body.agents as string[];
  }

  try {
    const result = await runAgentService(process.env, { task, agents }, fetch, requestContext.getStore()?.userId);
    return res.json(result);
  } catch (error) {
    if (error instanceof AgentServiceClientError) {
      if (error.statusCode === 429) {
        if (error.retryAfter) res.setHeader("Retry-After", error.retryAfter);
        return res.status(429).json({ error: "Слишком много запросов к AI-агентам. Повторите позже." });
      }
      if (error.statusCode === 503) {
        return res.status(503).json({ error: error.message });
      }
      if (error.statusCode === 504) {
        return res.status(504).json({ error: "AI-агенты не успели ответить. Повторите попытку позже." });
      }
    }
    console.error("Agent service request failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(502).json({ error: "AI-агенты временно недоступны." });
  }
});

// 1. Diagnostic Assistant
app.post("/api/ai/diagnose", requireGeminiAccess, async (req, res) => {
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
    const prompt = `Ты — ведущий профессиональный автомеханик и диагност в сервисной системе "Garage AI Rev".
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
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = parseJsonSafely(response.text, {});
    if (!validateDiagnosticResult(parsed)) {
      return res.status(502).json({ error: "AI вернул ответ в неподдерживаемом формате" });
    }
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

    if (typeof imageBase64 !== "string" || !imageBase64) {
      return res.status(400).json({ error: "Изображение чека не предоставлено." });
    }
    if (imageBase64.length > 9_000_000) {
      return res.status(413).json({ error: "Изображение чека слишком большое" });
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
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64) || cleanBase64.length % 4 === 1) {
      return res.status(400).json({ error: "Некорректное base64-изображение" });
    }

    const receiptPrompt = `Проанализируй фото автомобильного чека, заказ-наряда, квитанции СТО, чека АЗС или магазина автозапчастей.
Извлеки точные данные и верни JSON со структурой:
{
  "merchantName": "название СТО, АЗС или магазина",
  "date": "дата в формате YYYY-MM-DD, если есть, иначе сегодня",
  "totalAmount": 12500,
  "category": "repair" | "fuel" | "parts" | "wash" | "tires" | "tuning" | "other",
  "description": "краткое общее описание чека",
  "fuelDetails": { "fuelType": "АИ-95" | "ДТ" | null, "liters": 45.2, "pricePerLiter": 58.4 },
  "works": [{ "description": "Замена масла ДВС", "cost": 1500 }],
  "parts": [{ "name": "Масло моторное 5W-40", "brand": "Motul", "partNumber": "102784", "quantity": 1, "price": 5400 }],
  "notes": "важные примечания"
}`;
    const documentReceiptId = process.env.DOCUMENT_AI_RECEIPT_PROCESSOR_ID;
    if (documentReceiptId && process.env.GOOGLE_CLOUD_PROJECT) {
      try {
        const doc = await processWithDocumentAi(Buffer.from(cleanBase64, "base64"), supportedMime, documentReceiptId);
        const entities = (doc?.entities || []) as Array<{ type?: string; mentionText?: string; normalizedValue?: { text?: string; moneyValue?: { currencyCode?: string; units?: string; nanos?: number } } }>;
        const totalEntity = entities.find(item => (item.type || "").toLowerCase().includes("total_amount"));
        const totalText = documentEntityValue(entities, ["total_amount", "total"]);
        const totalAmount = totalEntity?.normalizedValue?.moneyValue?.units
          ? Number(totalEntity.normalizedValue.moneyValue.units) + Number(totalEntity.normalizedValue.moneyValue.nanos || 0) / 1e9
          : totalText ? Number(String(totalText).replace(/[^0-9.,-]/g, "").replace(",", ".")) : null;
        const googleResult = { merchantName: documentEntityValue(entities, ["supplier_name", "merchant_name", "supplier"]), date: documentEntityValue(entities, ["receipt_date", "date"]), totalAmount, category: "other", description: doc?.text || "", notes: doc?.text || "", _source: "google-document-ai" };
        const initialClassification = classifyReceiptText(doc?.text || "", googleResult.category);
        if (doc?.text && getOpenRouterConfig("receipt").key) {
          try {
            const refined = await requestOpenRouterReceiptFields(doc.text);
            return res.json({
              ...googleResult,
              merchantName: refined.merchantName || googleResult.merchantName,
              date: refined.date || googleResult.date,
              totalAmount: Number.isFinite(Number(refined.totalAmount)) ? Number(refined.totalAmount) : googleResult.totalAmount,
              category: classifyReceiptText(`${doc.text}\n${JSON.stringify(refined)}`, refined.category || initialClassification.category).category,
              fuelDetails: classifyReceiptText(`${doc.text}\n${JSON.stringify(refined)}`, refined.category || initialClassification.category).fuelDetails || refined.fuelDetails,
              description: refined.description || googleResult.description,
              notes: refined.notes || googleResult.notes,
              _source: "google-document-ai+openrouter-text",
            });
          }
          catch (error) { console.warn("OpenRouter receipt refinement failed; using Google result:", error); }
        }
        return res.json({ ...googleResult, ...initialClassification });
      } catch (error) { console.warn("Document AI receipt failed, using vision fallback:", error); }
    }
    const hasReceiptOpenRouter = Boolean(process.env.OPENROUTER_RECEIPT_API_KEY || process.env.OPENROUTER_API_KEY);
    const responseText = hasReceiptOpenRouter
      ? await requestOpenRouterVision(cleanBase64, supportedMime, receiptPrompt, "receipt")
      : (await getAi().models.generateContent({
          model: GEMINI_MODEL,
          contents: { parts: [{ inlineData: { data: cleanBase64, mimeType: supportedMime } }, { text: receiptPrompt }] },
          config: { responseMimeType: "application/json" },
        })).text;
    const parsed = parseJsonSafely(responseText, {});
    const classification = classifyReceiptText(
      `${responseText}\n${JSON.stringify(parsed)}`,
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).category : undefined,
    );
    res.json({
      ...parsed,
      category: classification.category,
      ...(classification.fuelDetails && !("fuelDetails" in (parsed as Record<string, unknown>))
        ? { fuelDetails: classification.fuelDetails }
        : {}),
    });
  } catch (error: any) {
    console.error("Receipt OCR error:", error);
    res.status(500).json({
      error: "Не удалось распознать чек.",
    });
  }
});

// 2b. Full document OCR with image preprocessing and local OCR fallback
app.post("/api/ai/scan-document", requireAiAccess, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (typeof imageBase64 !== "string" || !imageBase64) return res.status(400).json({ error: "Изображение документа не предоставлено." });
    if (imageBase64.length > 9_000_000) return res.status(413).json({ error: "Изображение документа слишком большое." });
    const detectedMime = imageBase64.match(/^data:([^;]+);base64,/)?.[1] || mimeType || "image/jpeg";
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "").trim();
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64) || cleanBase64.length % 4 === 1) return res.status(400).json({ error: "Некорректное base64-изображение." });
    const prepared = await prepareDocumentImage(Buffer.from(cleanBase64, "base64"));
    const documentOcrId =
      process.env.DOCUMENT_AI_OCR_PROCESSOR_ID || process.env.DOCUMENT_AI_DOCUMENT_PROCESSOR_ID;
    if (documentOcrId && process.env.GOOGLE_CLOUD_PROJECT) {
      try {
        const doc = await processWithDocumentAi(Buffer.from(cleanBase64, "base64"), detectedMime, documentOcrId);
        if (doc?.text) {
          let refinedText: string | null = null;
          let refinementWarning: string | null = null;
          if (OPENROUTER_DOCUMENT_REFINEMENT_ENABLED && getOpenRouterConfig("document").key) {
            try { refinedText = await requestOpenRouterDocumentRefinement(doc.text); }
            catch (error: any) { refinementWarning = error?.message || "OpenRouter refinement failed"; }
          }
          const text = mergeOcrText(doc.text, refinedText || "");
          return res.json({ text, sources: { vision: doc.text, local: "", google: doc.text, refined: refinedText }, preprocessing: { variants: ["google-document-ai", ...(refinedText ? ["openrouter-text-refinement"] : [])], mimeType: detectedMime }, warning: refinementWarning });
        }
      } catch (error) { console.warn("Document AI OCR failed, using fallback:", error); }
    }
    const local = await recognizeDocumentImage(prepared[0].image, "sparse");
    let vision = "";
    let visionError: string | null = null;
    if (process.env.OPENROUTER_DOCUMENT_API_KEY || process.env.OPENROUTER_API_KEY) {
      try { vision = await requestOpenRouterDocumentText(prepared[0].image.toString("base64"), "image/png"); } catch (error: any) { visionError = error?.message || "Document vision OCR failed"; }
    }
    const text = mergeOcrText(vision, local.text);
    res.json({ text, sources: { vision: vision || null, local: local.text, confidence: local.confidence }, preprocessing: { variants: prepared.map(item => item.name), mimeType: detectedMime }, warning: visionError });
  } catch (error: any) {
    console.error("Document OCR error:", error);
    res.status(500).json({ error: "Не удалось распознать документ." });
  }
});

// 3. OEM Factory Schedule Generator
app.post("/api/ai/oem-schedule", requireGeminiAccess, async (req, res) => {
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
      model: GEMINI_MODEL,
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
app.post("/api/ai/part-lookup", requireGeminiAccess, async (req, res) => {
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
      model: GEMINI_MODEL,
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
  if (store instanceof PostgresPersistence) {
    await store.initialize();
    await store.healthCheck();
  }
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

  // Keep malformed JSON, oversized payloads and unexpected middleware failures
  // in a stable JSON format; never send parser internals or raw payload fragments.
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    const safe = safeHttpErrorResponse(error);
    if (safe.status >= 500) {
      console.error("Unhandled HTTP middleware error");
    }
    return res.status(safe.status).json({ error: safe.message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Garage AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(async (error) => {
  console.error("Server startup failed:", error instanceof Error ? error.message : "unknown error");
  if (store instanceof PostgresPersistence) {
    await store.close().catch(() => undefined);
  }
  process.exitCode = 1;
});

