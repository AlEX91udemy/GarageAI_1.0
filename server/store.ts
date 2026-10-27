import fs from "fs";
import path from "path";
import { hashEmailCode } from "./emailCodeAuth";

export interface GarageData {
  vehicles: unknown[];
  reminders: unknown[];
  serviceRecords: unknown[];
  fuelRecords: unknown[];
  oemSchedules: unknown[];
  garageParts: unknown[];
  toFixTasks: unknown[];
  tuningStages: unknown[];
  lastUpdated: string;
}

export class UserAlreadyExistsError extends Error {
  constructor() {
    super("Пользователь с таким логином уже существует");
    this.name = "UserAlreadyExistsError";
  }
}

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  email?: string;
}

export interface EmailAuthChallengeRecord {
  id: string;
  userId: string;
  codeHash: string;
  expiresAtMs: number;
  attempts: number;
  consumedAtMs?: number;
  createdAtMs: number;
}

interface StoreShape {
  version: 2;
  users: UserRecord[];
  // Данные разделённые по владельцу. Ключ — id пользователя.
  garages: Record<string, GarageData>;
  emailChallenges: EmailAuthChallengeRecord[];
}

const EMPTY_KEYS: Array<keyof Omit<GarageData, "lastUpdated">> = [
  "vehicles",
  "reminders",
  "serviceRecords",
  "fuelRecords",
  "oemSchedules",
  "garageParts",
  "toFixTasks",
  "tuningStages",
];

export function emptyGarage(): GarageData {
  const data = { lastUpdated: new Date().toISOString() } as GarageData;
  for (const key of EMPTY_KEYS) data[key] = [];
  return data;
}

export function cloneGarage<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function coerceGarage(value: unknown, seed: () => GarageData): GarageData {
  if (!value || typeof value !== "object") return cloneGarage(seed());
  const source = value as Record<string, unknown>;
  const data = emptyGarage();
  for (const key of EMPTY_KEYS) {
    if (Array.isArray(source[key])) data[key] = cloneGarage(source[key] as unknown[]);
  }
  if (typeof source.lastUpdated === "string") data.lastUpdated = source.lastUpdated;
  return data;
}

function writeJsonAtomic(targetFile: string, payload: unknown): void {
  const tmpFile = `${targetFile}.${process.pid}.${Date.now()}.tmp`;
  const legacyTmpFile = `${targetFile}.tmp`;
  try {
    const serialized = JSON.stringify(payload, null, 2);
    fs.writeFileSync(tmpFile, serialized, "utf-8");
    fs.renameSync(tmpFile, targetFile);
  } catch (error) {
    try {
      if (fs.existsSync(tmpFile)) fs.rmSync(tmpFile, { force: true });
    } catch {
      // ignore cleanup error
    }
    try {
      if (fs.existsSync(legacyTmpFile)) fs.rmSync(legacyTmpFile, { force: true });
    } catch {
      // ignore cleanup error
    }
    throw error;
  }
}

export class GarageStore {
  private state: StoreShape;
  private writeChain: Promise<unknown> = Promise.resolve();
  private lastPersistError: Error | null = null;
  private readonly usersFile: string;
  private readonly emailChallengesFile: string;

  constructor(private readonly dataFile: string, private readonly seed: () => GarageData) {
    const baseDir = path.dirname(dataFile);
    fs.mkdirSync(baseDir, { recursive: true });
    this.usersFile = path.join(baseDir, "users.json");
    this.emailChallengesFile = path.join(baseDir, "email_auth_challenges.json");
    this.state = this.load();
  }

  private load(): StoreShape {
    let users: UserRecord[] = [];
    if (fs.existsSync(this.usersFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.usersFile, "utf-8"));
        if (Array.isArray(parsed)) users = parsed;
      } catch (error) {
        console.error("Не удалось прочитать users.json:", error);
      }
    }

    const garages: Record<string, GarageData> = {};
    if (fs.existsSync(this.dataFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.dataFile, "utf-8"));
        if (parsed && typeof parsed === "object" && parsed.garages && typeof parsed.garages === "object") {
          for (const [userId, value] of Object.entries(parsed.garages as Record<string, unknown>)) {
            garages[userId] = coerceGarage(value, this.seed);
          }
        } else if (Array.isArray(parsed?.vehicles)) {
          console.warn(
            "Обнаружен garage_store.json в старом формате. Данные без владельца не перенесены автоматически."
          );
        }
      } catch (error) {
        console.error("Не удалось прочитать garage_store.json:", error);
      }
    }

    let emailChallenges: EmailAuthChallengeRecord[] = [];
    if (fs.existsSync(this.emailChallengesFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.emailChallengesFile, "utf-8"));
        if (Array.isArray(parsed)) emailChallenges = parsed.filter((item) => item && typeof item.id === "string");
      } catch { /* ignore malformed disposable challenge state */ }
    }
    return { version: 2, users, garages, emailChallenges };
  }

  private persistUsers(usersSnapshot: UserRecord[]): void {
    writeJsonAtomic(this.usersFile, usersSnapshot);
  }

  private persistGarages(garagesSnapshot: Record<string, GarageData>): void {
    writeJsonAtomic(this.dataFile, { version: 2, garages: garagesSnapshot });
  }

  getLastPersistError(): Error | null {
    return this.lastPersistError;
  }

  /**
   * Транзакционная мутация гаража пользователя:
   * изменения выполняются над изолированной копией и применяются к памяти
   * только после успешной атомарной записи на диск.
   */
  run<T>(userId: string, mutator: (garage: GarageData) => T | Promise<T>): Promise<T> {
    const task = this.writeChain.then(async () => {
      const hadExisting = Object.prototype.hasOwnProperty.call(this.state.garages, userId);
      const current = hadExisting ? this.state.garages[userId] : emptyGarage();
      const workingCopy = cloneGarage(current);

      const value = await mutator(workingCopy);
      const coercedCopy = coerceGarage(workingCopy, () => emptyGarage());
      coercedCopy.lastUpdated = new Date().toISOString();

      const nextGarages: Record<string, GarageData> = {
        ...this.state.garages,
        [userId]: coercedCopy,
      };

      this.persistGarages(nextGarages);
      this.state.garages[userId] = coercedCopy;
      this.lastPersistError = null;
      return value;
    });

    this.writeChain = task.then(
      () => undefined,
      (err) => {
        this.lastPersistError = err instanceof Error ? err : new Error(String(err));
        return undefined;
      }
    );

    return task;
  }

  commitGarage(userId: string, snapshot: GarageData): Promise<GarageData> {
    const clonedSnapshot = cloneGarage(snapshot);
    return this.run(userId, (draft) => {
      for (const key of EMPTY_KEYS) {
        draft[key] = Array.isArray(clonedSnapshot[key]) ? clonedSnapshot[key] : [];
      }
      return draft;
    });
  }

  schedulePersist(userId: string, snapshot?: GarageData): Promise<void> {
    const source = snapshot ? cloneGarage(snapshot) : undefined;
    const task = this.writeChain.then(() => {
      const base = source ?? this.garageForUser(userId, true);
      const committed = coerceGarage(base, () => emptyGarage());
      committed.lastUpdated = new Date().toISOString();

      const nextGarages: Record<string, GarageData> = {
        ...this.state.garages,
        [userId]: committed,
      };

      this.persistGarages(nextGarages);
      this.state.garages[userId] = committed;
      this.lastPersistError = null;
    });

    const safeChain = task.catch((err) => {
      this.lastPersistError = err instanceof Error ? err : new Error(String(err));
      console.error("Ошибка сохранения garage_store.json:", err);
    });
    this.writeChain = safeChain;
    return safeChain;
  }

  flush(): Promise<void> {
    return this.writeChain.then(() => undefined);
  }

  garageForUser(userId: string, create = false): GarageData {
    const existing = this.state.garages[userId];
    if (existing) return existing;
    const created = create ? emptyGarage() : cloneGarage(this.seed());
    this.state.garages[userId] = created;
    return created;
  }

  snapshotForUser(userId: string, create = false): GarageData {
    return cloneGarage(this.garageForUser(userId, create));
  }

  getUserByName(username: string): UserRecord | undefined {
    const key = username.toLowerCase();
    return this.state.users.find((user) => user.username.toLowerCase() === key);
  }

  getUserById(id: string): UserRecord | undefined {
    return this.state.users.find((user) => user.id === id);
  }

  listUsers(): UserRecord[] {
    return this.state.users.map((u) => ({ ...u }));
  }

  async createUser(username: string, passwordHash: string, id: string, email?: string): Promise<UserRecord> {
    const task = this.writeChain.then(() => {
      const normalizedUsername = username.trim().toLowerCase();
      if (this.state.users.some((user) => user.username.trim().toLowerCase() === normalizedUsername)) {
        throw new UserAlreadyExistsError();
      }
      if (email && this.state.users.some((user) => user.email?.trim().toLowerCase() === email.trim().toLowerCase())) {
        throw new UserAlreadyExistsError();
      }
      const created: UserRecord = {
        id,
        username,
        passwordHash,
        createdAt: new Date().toISOString(),
        ...(email ? { email } : {}),
      };
      const nextUsers = [...this.state.users, created];
      const nextGarage = emptyGarage();
      const nextGarages: Record<string, GarageData> = {
        ...this.state.garages,
        [id]: nextGarage,
      };

      this.persistUsers(nextUsers);
      this.persistGarages(nextGarages);

      this.state.users = nextUsers;
      this.state.garages[id] = nextGarage;
      this.lastPersistError = null;
      return created;
    });

    this.writeChain = task.then(
      () => undefined,
      (err) => {
        this.lastPersistError = err instanceof Error ? err : new Error(String(err));
        return undefined;
      }
    );

    return task;
  }

  getUserByEmail(email: string): UserRecord | undefined {
    const key = email.trim().toLowerCase();
    return this.state.users.find((user) => user.email?.trim().toLowerCase() === key);
  }

  async createEmailChallenge(record: EmailAuthChallengeRecord): Promise<void> {
    const task = this.writeChain.then(() => {
      const next = this.state.emailChallenges.filter((item) => item.userId !== record.userId || item.consumedAtMs || item.expiresAtMs <= Date.now());
      next.push({ ...record });
      writeJsonAtomic(this.emailChallengesFile, next);
      this.state.emailChallenges = next;
    });
    this.writeChain = task.then(() => undefined, () => undefined);
    await task;
  }

  async verifyEmailChallenge(userId: string, code: string, secret: string, now = Date.now(), maxAttempts = 5): Promise<boolean> {
    const task = this.writeChain.then(() => {
      const challenge = this.state.emailChallenges
        .filter((item) => item.userId === userId && !item.consumedAtMs)
        .sort((a, b) => b.createdAtMs - a.createdAtMs)[0];
      if (!challenge || challenge.expiresAtMs <= now || challenge.attempts >= maxAttempts) return false;
      challenge.attempts += 1;
      const accepted = challenge.codeHash === hashEmailCode(challenge.id, code, secret);
      if (accepted) challenge.consumedAtMs = now;
      writeJsonAtomic(this.emailChallengesFile, this.state.emailChallenges);
      return accepted;
    });
    this.writeChain = task.then(() => undefined, () => undefined);
    return task;
  }

  countUsers(): number {
    return this.state.users.length;
  }
}
