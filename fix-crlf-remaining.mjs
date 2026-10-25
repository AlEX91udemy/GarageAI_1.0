// Файл: fix-crlf-remaining.mjs
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function patchFile(relPath, mutator) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[SKIP] Файл не найден: ${relPath}`);
    return;
  }
  const raw = fs.readFileSync(fullPath, "utf-8");
  const normalized = raw.replace(/\r\n/g, "\n");
  const updated = mutator(normalized);
  if (updated !== normalized) {
    fs.writeFileSync(fullPath, updated, "utf-8");
    console.log(`[FIXED] ${relPath}`);
  } else {
    console.log(`[OK - NO CHANGES NEEDED] ${relPath}`);
  }
}

function mustReplace(content, label, searchStr, replaceStr) {
  const s = searchStr.replace(/\r\n/g, "\n");
  const r = replaceStr.replace(/\r\n/g, "\n");
  if (content.includes(r)) {
    console.log(`  ✓ Уже применено: ${label}`);
    return content;
  }
  if (!content.includes(s)) {
    console.error(`  ✗ ОШИБКА: не найден блок для [${label}]`);
    return content;
  }
  console.log(`  + Применён патч: ${label}`);
  return content.replace(s, r);
}

// 1. Патчим server.ts (с учётом CRLF и точного текста из коммита 35804295)
patchFile("server.ts", (s) => {
  // 1.1 Origin & trust proxy
  s = mustReplace(
    s,
    "DEF-02: Origin & trust proxy",
    `// Middleware for parsing JSON with a 10mb limit for receipt photos
app.use(express.json({ limit: "10mb" }));

// Базовая защита от клиентских подделок Origin на state-changing запросах.
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
    if (originHost !== req.headers.host) {
      return res.status(403).json({ error: "Запрос отклонён: несовпадение origin" });
    }
  }
  return next();
});`,
    `app.set("trust proxy", 1);

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
});`
  );

  // 1.2 Удаление мёртвой функции ensureDatabaseExists + добавление isSafeAssetUrl
  s = mustReplace(
    s,
    "DEF-10: remove dead ensureDatabaseExists",
    `function ensureDatabaseExists(): GarageDatabase {
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
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
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
}`,
    `function isSafeAssetUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 5_000_000) return false;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    /^data:image\\/(jpeg|jpg|png|webp|gif);base64,/i.test(trimmed)
  );
}`
  );

  // 1.3 DEF-11: saveDatabase передаёт изолированный снимок context.garage
  s = mustReplace(
    s,
    "DEF-11: saveDatabase passes context.garage snapshot",
    `function saveDatabase(): void {
  const context = requestContext.getStore();
  if (!context) return;
  store.schedulePersist(context.userId);
}`,
    `function saveDatabase(): Promise<void> {
  const context = requestContext.getStore();
  if (!context) return Promise.resolve();
  return store.schedulePersist(context.userId, context.garage);
}`
  );

  s = s.replace(/store\.garageForUser\(([^,)]+),\s*true\)/g, "store.snapshotForUser($1, true)");

  // 1.4 DEF-06: AbortSignal.timeout(25_000) во всех вызовах fetch(OPENROUTER_URL)
  s = s.replace(
    /const response = await fetch\(OPENROUTER_URL,\s*\{\n(\s*method:\s*"POST",)/g,
    'const response = await fetch(OPENROUTER_URL, {\n    signal: AbortSignal.timeout(25_000),\n$1'
  );

  // 1.5 DEF-04 & DEF-05: POST/PUT/DELETE /api/vehicles
  s = mustReplace(
    s,
    "DEF-04: POST & PUT /api/vehicles whitelist and URL validation",
    `  const newVehicle: Vehicle = {
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

  const updates = { ...req.body } as Partial<Vehicle>;
  if (updates.make !== undefined && (typeof updates.make !== "string" || !updates.make.trim())) {
    return res.status(400).json({ error: "Марка не может быть пустой" });
  }
  if (updates.model !== undefined && (typeof updates.model !== "string" || !updates.model.trim())) {
    return res.status(400).json({ error: "Модель не может быть пустой" });
  }
  if (updates.bodyType !== undefined && !VALID_BODY_TYPES.has(updates.bodyType)) {
    return res.status(400).json({ error: "Некорректный тип кузова" });
  }
  if (updates.year !== undefined && (!Number.isInteger(Number(updates.year)) || Number(updates.year) < 1886 || Number(updates.year) > new Date().getFullYear() + 1)) {
    return res.status(400).json({ error: "Некорректный год выпуска" });
  }
  if (updates.currentMileage !== undefined && (!Number.isFinite(Number(updates.currentMileage)) || Number(updates.currentMileage) < 0)) {
    return res.status(400).json({ error: "Некорректный пробег" });
  }
  if (
    updates.colorHex !== undefined &&
    (typeof updates.colorHex !== "string" || !/^#[0-9a-f]{6}$/i.test(updates.colorHex))
  ) {
    return res.status(400).json({ error: "Некорректный цвет кузова" });
  }

  dbMemory.vehicles[index] = {
    ...dbMemory.vehicles[index],
    ...updates,
    id: req.params.id,
  };

  saveDatabase();
  res.json(dbMemory.vehicles[index]);
});`,
    `  if (body.photoUrl !== undefined && body.photoUrl !== "" && !isSafeAssetUrl(body.photoUrl)) {
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
  saveDatabase();
  res.status(201).json(newVehicle);
});

app.put("/api/vehicles/:id", (req, res) => {
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

  saveDatabase();
  res.json(dbMemory.vehicles[index]);
});`
  );

  s = mustReplace(
    s,
    "DEF-05: DELETE /api/vehicles/:id reminders cleanup",
    `  // Also clean up linked records
  dbMemory.serviceRecords = dbMemory.serviceRecords.filter((r) => r.vehicleId !== id);`,
    `  // Also clean up linked records
  dbMemory.reminders = dbMemory.reminders.filter((r) => r.vehicleId !== id);
  dbMemory.serviceRecords = dbMemory.serviceRecords.filter((r) => r.vehicleId !== id);`
  );

  // 1.6 DEF-07: Clone before sort in GET /api/services & GET /api/fuel
  s = mustReplace(
    s,
    "DEF-07: GET /api/services clone before sort",
    `app.get("/api/services", (req, res) => {
  const { vehicleId, category, search } = req.query;
  let list = dbMemory.serviceRecords;`,
    `app.get("/api/services", (req, res) => {
  const { vehicleId, category, search } = req.query;
  let list = [...dbMemory.serviceRecords];`
  );

  s = mustReplace(
    s,
    "DEF-07: GET /api/fuel clone before sort",
    `app.get("/api/fuel", (req, res) => {
  const { vehicleId } = req.query;
  let list = dbMemory.fuelRecords;`,
    `app.get("/api/fuel", (req, res) => {
  const { vehicleId } = req.query;
  let list = [...dbMemory.fuelRecords];`
  );

  // 1.7 DEF-03 & DEF-08: POST /api/services
  s = mustReplace(
    s,
    "DEF-03 & DEF-08: POST /api/services parts normalization & deduction",
    `  const parts = Array.isArray(body.parts) ? body.parts : [];
  const partsCost = parts.reduce((sum, p) => sum + (p.quantity || 1) * (p.unitPrice || 0), 0);
  const laborCost = Number(body.laborCost) || 0;
  const totalCost = body.totalCost !== undefined ? Number(body.totalCost) : laborCost + partsCost;
  if (![laborCost, totalCost, partsCost].every((value) => Number.isFinite(value) && value >= 0)) {
    return res.status(400).json({ error: "Стоимость должна быть неотрицательным числом" });
  }

  const newRecord: ServiceRecord = {
    id: body.id || \`rec-\${Date.now()}\`,
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

  // Mark garage parts installed if part numbers match.
  // Учитываем привязку детали к автомобилю и остаток: если на складе несколько
  // экземпляров — списываем одну штуку, вместо мгновенной установки всей позиции.
  if (parts.length > 0) {
    const partNumbers = parts.map((p) => p.partNumber.toLowerCase());
    dbMemory.garageParts.forEach((gp) => {
      if (
        (gp.vehicleId === newRecord.vehicleId || gp.vehicleId === "all") &&
        partNumbers.includes(gp.partNumber.toLowerCase())
      ) {
        if (gp.quantity > 1) {
          gp.quantity -= 1;
        } else {
          gp.status = "installed";
        }
      }
    });
  }`,
    `  const parts = Array.isArray(body.parts)
    ? body.parts.map((p, idx) => ({
        id: typeof p?.id === "string" && p.id.trim() ? p.id.trim() : \`part-\${Date.now()}-\${idx}\`,
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
    date: body.date,
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
          p.id === \`gp-\${gp.id}\`
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
  }`
  );

  // 1.8 DEF-08: POST /api/fuel & POST /api/inventory uniqueId & date validation
  s = mustReplace(
    s,
    "DEF-08: POST /api/fuel date validation",
    `  if (typeof body.vehicleId !== "string" || !body.vehicleId.trim() || typeof body.date !== "string" || !body.date.trim()) {
    return res.status(400).json({ error: "vehicleId, date и liters обязательны" });
  }`,
    `  if (typeof body.vehicleId !== "string" || !body.vehicleId.trim() || !isValidDate(body.date)) {
    return res.status(400).json({ error: "vehicleId, корректная date (YYYY-MM-DD) и liters обязательны" });
  }`
  );

  s = mustReplace(
    s,
    "DEF-08: POST /api/fuel uniqueId",
    `  const newFuel: FuelRecord = {
    id: body.id || \`fuel-\${Date.now()}\`,`,
    `  const newFuel: FuelRecord = {
    id: uniqueId(body.id, "fuel", dbMemory.fuelRecords),`
  );

  s = mustReplace(
    s,
    "DEF-08: POST /api/inventory uniqueId",
    `  const newPart: GaragePart = {
    id: body.id || \`gp-\${Date.now()}\`,`,
    `  const newPart: GaragePart = {
    id: uniqueId(body.id, "gp", dbMemory.garageParts),`
  );

  return s;
});

// 2. Патчим src/App.tsx (с нормализацией CRLF)
patchFile("src/App.tsx", (app) => {
  app = mustReplace(
    app,
    "DEF-03/14: handleSaveServiceRecord single deduction via installedPartIds",
    `    if (usedPartIds && usedPartIds.length > 0) {
      usedPartIds.forEach((partId) => {
        apiInstallGaragePart(partId).catch(console.error);
      });
    }

    // Keep edit and create operations separate so editing never duplicates a record.
    const saveRequest = currentRecords.some((record) => record.id === newRecord.id)
      ? apiUpdateServiceRecord(newRecord.id, newRecord)
      : apiCreateServiceRecord({ ...newRecord, completedTaskId });`,
    `    // Keep edit and create operations separate so editing never duplicates a record.
    const saveRequest = currentRecords.some((record) => record.id === newRecord.id)
      ? apiUpdateServiceRecord(newRecord.id, newRecord)
      : apiCreateServiceRecord({
          ...newRecord,
          completedTaskId,
          ...(usedPartIds && usedPartIds.length > 0 ? { installedPartIds: usedPartIds } : {}),
        } as any);`
  );

  app = mustReplace(
    app,
    "DEF-15: handleDeleteVehicle last vehicle & linked records cleanup",
    `  // Delete vehicle
  const handleDeleteVehicle = (vehicleId: string) => {
    const remaining = vehicles.filter((v) => v.id !== vehicleId);
    if (remaining.length > 0) {
      setVehicles(remaining);
      setActiveVehicleId(remaining[0].id);
    }
    apiDeleteVehicle(vehicleId).catch(console.error);
  };`,
    `  // Delete vehicle
  const handleDeleteVehicle = (vehicleId: string) => {
    const remaining = vehicles.filter((v) => v.id !== vehicleId);
    setVehicles(remaining);
    setActiveVehicleId(remaining[0]?.id || "empty-garage");
    setReminders((prev) => prev.filter((r) => r.vehicleId !== vehicleId));
    setServiceRecords((prev) => prev.filter((r) => r.vehicleId !== vehicleId));
    setFuelRecords((prev) => prev.filter((r) => r.vehicleId !== vehicleId));
    setOemSchedules((prev) => prev.filter((s) => s.vehicleId !== vehicleId));
    setGarageParts((prev) => prev.filter((p) => p.vehicleId !== vehicleId));
    setToFixTasks((prev) => prev.filter((t) => t.vehicleId !== vehicleId));
    setTuningStages((prev) => prev.filter((t) => t.vehicleId !== vehicleId));
    apiDeleteVehicle(vehicleId).catch(console.error);
  };`
  );

  app = mustReplace(
    app,
    "DEF-13: handleDataReloaded reminders & tuningStages",
    `  const handleDataReloaded = (data: FullGarageData) => {
    setVehicles(data.vehicles);
    if (data.vehicles.length > 0) {
      setActiveVehicleId(data.vehicles[0].id);
    }
    setServiceRecords(data.serviceRecords);
    setFuelRecords(data.fuelRecords);
    setOemSchedules(data.oemSchedules);
    setGarageParts(data.garageParts);
    setToFixTasks(data.toFixTasks);
  };`,
    `  const handleDataReloaded = (data: FullGarageData) => {
    setVehicles(data.vehicles || []);
    setActiveVehicleId(data.vehicles?.[0]?.id || "empty-garage");
    setReminders(data.reminders || []);
    setServiceRecords(data.serviceRecords || []);
    setFuelRecords(data.fuelRecords || []);
    setOemSchedules(data.oemSchedules || []);
    setGarageParts(data.garageParts || []);
    setToFixTasks(data.toFixTasks || []);
    setTuningStages(data.tuningStages || []);
  };`
  );

  return app;
});

// 3. Патчим index.html (удаление многострочного фильтра 'is not a function')
patchFile("index.html", (html) => {
  const updated = html.replace(
    /(?:msg|reason)\.indexOf\('is not a function'\)\s*!==\s*-1\s*\|\|\s*\n\s*/g,
    ""
  );
  if (updated !== html) {
    console.log("  + Применён патч: DEF-09 (удалено подавление 'is not a function' в index.html)");
  }
  return updated;
});

console.log("\nГотово! Все оставшиеся блоки в server.ts, src/App.tsx и index.html успешно обновлены.");