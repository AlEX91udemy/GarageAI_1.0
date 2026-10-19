import fs from "fs";
import path from "path";

export interface GarageData {
  vehicles: unknown[];
  serviceRecords: unknown[];
  fuelRecords: unknown[];
  oemSchedules: unknown[];
  garageParts: unknown[];
  toFixTasks: unknown[];
  tuningStages: unknown[];
  lastUpdated: string;
}

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

interface StoreShape {
  version: 2;
  users: UserRecord[];
  // Данные разделённые по владельцу. Ключ — id пользователя.
  garages: Record<string, GarageData>;
}

const EMPTY_KEYS: Array<keyof Omit<GarageData, "lastUpdated">> = [
  "vehicles",
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

function coerceGarage(value: unknown, seed: () => GarageData): GarageData {
  if (!value || typeof value !== "object") return seed();
  const source = value as Record<string, unknown>;
  const data = emptyGarage();
  for (const key of EMPTY_KEYS) {
    if (Array.isArray(source[key])) data[key] = source[key] as unknown[];
  }
  if (typeof source.lastUpdated === "string") data.lastUpdated = source.lastUpdated;
  return data;
}

export class GarageStore {
  private state: StoreShape;
  private writeChain: Promise<unknown> = Promise.resolve();
  private readonly usersFile: string;
  constructor(private readonly dataFile: string, private readonly seed: () => GarageData) {
    const baseDir = path.dirname(dataFile);
    fs.mkdirSync(baseDir, { recursive: true });
    this.usersFile = path.join(baseDir, "users.json");
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

    let garages: Record<string, GarageData> = {};
    if (fs.existsSync(this.dataFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.dataFile, "utf-8"));
        if (parsed && typeof parsed === "object" && parsed.garages && typeof parsed.garages === "object") {
          for (const [userId, value] of Object.entries(parsed.garages as Record<string, unknown>)) {
            garages[userId] = coerceGarage(value, this.seed);
          }
        } else if (Array.isArray(parsed?.vehicles)) {
          // Миграция со старого формата: данные без владельца не привязываются
          // ни к одному аккаунту и остаются в ахиве до ручного переноса.
          console.warn("Обнаружен garage_store.json в старом формате. Данные без владельца не перенесены автоматически.");
        }
      } catch (error) {
        console.error("Не удалось прочитать garage_store.json:", error);
      }
    }

    return { version: 2, users, garages };
  }

  private persist(): void {
    const usersTmp = `${this.usersFile}.tmp`;
    fs.writeFileSync(usersTmp, JSON.stringify(this.state.users, null, 2), "utf-8");
    fs.renameSync(usersTmp, this.usersFile);

    const dataTmp = `${this.dataFile}.tmp`;
    fs.writeFileSync(dataTmp, JSON.stringify({ version: 2, garages: this.state.garages }, null, 2), "utf-8");
    fs.renameSync(dataTmp, this.dataFile);
  }

  /**
   * Сериализует все мутации: операции выполняются строго по очереди,
   * поэтому параллельные запросы не могут затереть друг друга.
   */
  run<T>(userId: string, mutator: (garage: GarageData) => T | Promise<T>): Promise<T> {
    const result = this.writeChain.then(async () => {
      const garage = this.garageForUser(userId, true);
      const value = await mutator(garage);
      garage.lastUpdated = new Date().toISOString();
      this.persist();
      return value;
    });
    this.writeChain = result.catch(() => undefined);
    return result;
  }

  /**
   * Ставит запись гаража пользователя в общую очередь.
   * Снимки сохраняются строго в порядке запросов, поэтому последний
   * записанный снимок всегда соответствует последней мутации.
   */
  schedulePersist(userId: string): void {
    const garage = this.garageForUser(userId, true);
    this.writeChain = this.writeChain
      .catch(() => undefined)
      .then(() => {
        garage.lastUpdated = new Date().toISOString();
        this.persist();
      });
  }

  garageForUser(userId: string, create = false): GarageData {
    const existing = this.state.garages[userId];
    if (existing) return existing;
    const created = create ? emptyGarage() : this.seed();
    this.state.garages[userId] = created;
    return created;
  }

  getUserByName(username: string): UserRecord | undefined {
    const key = username.toLowerCase();
    return this.state.users.find((user) => user.username.toLowerCase() === key);
  }

  getUserById(id: string): UserRecord | undefined {
    return this.state.users.find((user) => user.id === id);
  }

  listUsers(): UserRecord[] {
    return this.state.users;
  }

  async createUser(username: string, passwordHash: string, id: string): Promise<UserRecord> {
    let created!: UserRecord;
    const result = this.writeChain.then(() => {
      created = {
        id,
        username,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      this.state.users.push(created);
      // Каждый новый аккаунт получает отдельную копию демо-данных.
      this.state.garages[id] = this.seed();
      this.persist();
      return created;
    });
    this.writeChain = result.catch(() => undefined);
    return result;
  }

  countUsers(): number {
    return this.state.users.length;
  }
}
