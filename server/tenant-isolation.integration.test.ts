// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

type Auth = { cookie: string; csrfToken: string };
let child: ChildProcessWithoutNullStreams | undefined;
let baseUrl = "";
let tempDir = "";
let childOutput = "";

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate test port");
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      throw new Error(`Test server exited early: ${childOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The server has not started listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Test server did not become ready: ${childOutput}`);
}

async function register(username: string): Promise<Auth> {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ username, password: "TestPassword-123!" }),
  });
  const body = await response.json() as { session?: { csrfToken?: string }; error?: string };
  if (response.status !== 201 || !body.session?.csrfToken) {
    throw new Error(`Registration failed for ${username}: ${response.status} ${JSON.stringify(body)}`);
  }
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Registration did not set a session cookie");
  return { cookie: setCookie.split(";")[0], csrfToken: body.session.csrfToken };
}

async function request(auth: Auth, route: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("cookie", auth.cookie);
  headers.set("origin", baseUrl);
  if (init.method && !["GET", "HEAD"].includes(init.method.toUpperCase())) {
    headers.set("x-csrf-token", auth.csrfToken);
  }
  return fetch(`${baseUrl}${route}`, { ...init, headers });
}

describe("HTTP tenant isolation", () => {
  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "garageai-http-isolation-"));
    const port = await freePort();
    baseUrl = `http://127.0.0.1:${port}`;
    const spawned = spawn(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "server.ts"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "production",
          // The HTTP integration server uses disposable test files, never real production data.
          GARAGE_ALLOW_EPHEMERAL_STORAGE: "true",
          PORT: String(port),
          GARAGE_DB_FILE: path.join(tempDir, "garage_store.json"),
          GARAGE_SESSIONS_FILE: path.join(tempDir, "sessions.json"),
          GEMINI_API_KEY: "",
          OPENROUTER_API_KEY: "",
          OPENROUTER_RECEIPT_API_KEY: "",
          OPENROUTER_DOCUMENT_API_KEY: "",
          GOOGLE_GENAI_USE_VERTEXAI: "false",
          GOOGLE_CLOUD_PROJECT: "",
          AGENTS_SERVICE_URL: "https://garageai-agents-test.example",
          AGENTS_API_TOKEN: "integration-test-token",
          AGENTS_ALLOWED_USERNAMES: "agent-proxy-validation",
          ALLOWED_ORIGINS: baseUrl,
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    child = spawned;
    spawned.stdout.on("data", (chunk) => { childOutput += String(chunk); });
    spawned.stderr.on("data", (chunk) => { childOutput += String(chunk); });
    await waitForServer();
  }, 30_000);

  afterAll(async () => {
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          child?.kill("SIGKILL");
          resolve();
        }, 3_000);
        child?.once("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("reports provider readiness without mislabeling Vertex AI as an API key", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    const health = await response.json() as {
      hasApiKey: boolean;
      hasAiConfigured: boolean;
      hasGeminiConfigured: boolean;
      vertexAiEnabled: boolean;
    };
    expect(health.hasApiKey).toBe(false);
    expect(health.hasAiConfigured).toBe(false);
    expect(health.hasGeminiConfigured).toBe(false);
    expect(health.vertexAiEnabled).toBe(false);
  });

  it("rejects anonymous access to private garage routes", async () => {
    const response = await fetch(`${baseUrl}/api/vehicles`);
    expect(response.status).toBe(401);
  });

  it("prevents one user from reading, updating, deleting, or exporting another user's records", async () => {
    const alice = await register("alice-test");
    const bob = await register("bob-test");

    const created = await request(alice, "/api/vehicles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ make: "Toyota", model: "IsolationTest", year: 2020, currentMileage: 12000 }),
    });
    expect(created.status).toBe(201);
    const aliceVehicle = await created.json() as { id: string };

    const serviceResponse = await request(alice, "/api/services", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        vehicleId: aliceVehicle.id,
        title: "Private service record",
        date: "2026-10-01",
        mileage: 12000,
        description: "Isolation integration test",
      }),
    });
    expect(serviceResponse.status).toBe(201);
    const aliceService = await serviceResponse.json() as { id: string };

    const bobList = await request(bob, "/api/vehicles");
    expect(bobList.status).toBe(200);
    expect(await bobList.json()).toEqual([]);

    expect((await request(bob, `/api/vehicles/${aliceVehicle.id}`)).status).toBe(404);
    expect((await request(bob, `/api/vehicles/${aliceVehicle.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ make: "Hijacked", model: "Vehicle" }),
    })).status).toBe(404);
    expect((await request(bob, `/api/vehicles/${aliceVehicle.id}`, { method: "DELETE" })).status).toBe(404);

    const bobServices = await request(bob, "/api/services");
    expect(bobServices.status).toBe(200);
    expect(await bobServices.json()).toEqual([]);
    expect((await request(bob, `/api/services/${aliceService.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Hijacked service" }),
    })).status).toBe(404);
    expect((await request(bob, `/api/services/${aliceService.id}`, { method: "DELETE" })).status).toBe(404);

    const bobBackup = await request(bob, "/api/backup/export");
    expect(bobBackup.status).toBe(200);
    const backupText = await bobBackup.text();
    expect(backupText).not.toContain(aliceVehicle.id);
    expect(backupText).not.toContain(aliceService.id);
    expect(backupText).not.toContain("IsolationTest");
    expect(backupText).not.toContain("Private service record");

    const aliceList = await request(alice, "/api/vehicles");
    expect(aliceList.status).toBe(200);
    expect(await aliceList.json()).toEqual([expect.objectContaining({ id: aliceVehicle.id, model: "IsolationTest" })]);
    const aliceServices = await request(alice, "/api/services");
    expect(aliceServices.status).toBe(200);
    expect(await aliceServices.json()).toEqual([expect.objectContaining({ id: aliceService.id, title: "Private service record" })]);
  });

  it("isolates all garage collections and rejects cross-user restore references", async () => {
    const owner = await register("resource-owner");
    const other = await register("resource-other");

    const vehicleResponse = await request(owner, "/api/vehicles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "resource-owner-car", make: "Honda", model: "PrivateResourceTest", year: 2024, currentMileage: 1000 }),
    });
    expect(vehicleResponse.status).toBe(201);

    const reminder = await request(owner, "/api/reminders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "owner-reminder", vehicleId: "resource-owner-car", kind: "osago", startDate: "2026-10-01", durationMonths: 12, price: 12000, notes: "Private reminder test" }),
    });
    expect(reminder.status).toBe(201);

    const fuel = await request(owner, "/api/fuel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "owner-fuel", vehicleId: "resource-owner-car", date: "2026-10-02", mileage: 1000, liters: 30, pricePerLiter: 60, totalCost: 1800, station: "Private station test" }),
    });
    expect(fuel.status).toBe(201);

    const part = await request(owner, "/api/inventory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "owner-part", vehicleId: "resource-owner-car", name: "Private brake pads", partNumber: "OWNER-TEST-001", quantity: 2 }),
    });
    expect(part.status).toBe(201);

    const task = await request(owner, "/api/to-fix", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "owner-task", vehicleId: "resource-owner-car", title: "Private repair task" }),
    });
    expect(task.status).toBe(201);

    const schedule = await request(owner, "/api/oem-schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vehicleId: "resource-owner-car", items: [{ id: "owner-oem", title: "Private service interval", intervalKm: 10000 }] }),
    });
    expect(schedule.status).toBe(201);

    const tuning = await request(owner, "/api/tuning", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "owner-tuning", vehicleId: "resource-owner-car", title: "Private tuning project" }),
    });
    expect(tuning.status).toBe(201);

    const otherDataResponse = await request(other, "/api/data");
    expect(otherDataResponse.status).toBe(200);
    const otherData = await otherDataResponse.json() as Record<string, unknown[]>;
    for (const key of ["vehicles", "reminders", "serviceRecords", "fuelRecords", "oemSchedules", "garageParts", "toFixTasks", "tuningStages"]) {
      expect(otherData[key], `other user should not see ${key}`).toEqual([]);
    }

    expect(await (await request(other, "/api/reminders")).json()).toEqual([]);
    expect(await (await request(other, "/api/fuel")).json()).toEqual([]);
    expect(await (await request(other, "/api/inventory")).json()).toEqual([]);
    expect(await (await request(other, "/api/to-fix")).json()).toEqual([]);
    expect(await (await request(other, "/api/oem-schedule")).json()).toEqual([]);
    expect(await (await request(other, "/api/tuning")).json()).toEqual([]);

    expect((await request(other, "/api/reminders/owner-reminder", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "osago", vehicleId: "resource-owner-car", startDate: "2026-10-01" }) })).status).toBe(404);
    expect((await request(other, "/api/reminders/owner-reminder", { method: "DELETE" })).status).toBe(404);
    expect((await request(other, "/api/fuel/owner-fuel", { method: "DELETE" })).status).toBe(404);
    expect((await request(other, "/api/inventory/owner-part", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Hijacked part" }) })).status).toBe(404);
    expect((await request(other, "/api/inventory/owner-part", { method: "DELETE" })).status).toBe(404);
    expect((await request(other, "/api/inventory/owner-part/install", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(404);
    expect((await request(other, "/api/to-fix/owner-task", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Hijacked task" }) })).status).toBe(404);
    expect((await request(other, "/api/to-fix/owner-task/complete", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(404);
    expect((await request(other, "/api/to-fix/owner-task", { method: "DELETE" })).status).toBe(404);
    expect((await request(other, "/api/oem-schedule/owner-oem", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Hijacked schedule" }) })).status).toBe(404);
    expect((await request(other, "/api/tuning/owner-tuning", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Hijacked tuning" }) })).status).toBe(404);
    expect((await request(other, "/api/tuning/owner-tuning", { method: "DELETE" })).status).toBe(404);
    expect((await request(other, "/api/stats/resource-owner-car")).status).toBe(404);

    const exportedOther = await request(other, "/api/backup/export");
    expect(exportedOther.status).toBe(200);
    const otherExport = await exportedOther.text();
    for (const privateValue of ["PrivateResourceTest", "Private reminder test", "Private station test", "Private brake pads", "Private repair task", "Private service interval", "Private tuning project"]) {
      expect(otherExport).not.toContain(privateValue);
    }

    const invalidRestore = await request(other, "/api/backup/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vehicles: [], serviceRecords: [{ id: "stolen-service", vehicleId: "resource-owner-car" }] }),
    });
    expect(invalidRestore.status).toBe(400);

    const ownerDataResponse = await request(owner, "/api/data");
    expect(ownerDataResponse.status).toBe(200);
    const ownerData = await ownerDataResponse.json() as Record<string, Array<{ id?: string; title?: string; name?: string }>>;
    expect(ownerData.vehicles).toEqual([expect.objectContaining({ id: "resource-owner-car", model: "PrivateResourceTest" })]);
    expect(ownerData.reminders).toEqual([expect.objectContaining({ id: "owner-reminder" })]);
    expect(ownerData.fuelRecords).toEqual([expect.objectContaining({ id: "owner-fuel" })]);
    expect(ownerData.garageParts).toEqual([expect.objectContaining({ id: "owner-part" })]);
    expect(ownerData.toFixTasks).toEqual([expect.objectContaining({ id: "owner-task" })]);
    expect(ownerData.oemSchedules).toEqual([expect.objectContaining({ id: "owner-oem" })]);
    expect(ownerData.tuningStages).toEqual([expect.objectContaining({ id: "owner-tuning" })]);
  });

  it("restores a valid backup atomically for only the receiving user", async () => {
    const receiver = await register("restore-receiver");
    const unrelated = await register("restore-unrelated");
    const backup = {
      vehicles: [{ id: "restore-car", make: "Mazda", model: "RestoreIsolation", year: 2022, currentMileage: 1234 }],
      reminders: [{ id: "restore-reminder", vehicleId: "restore-car", kind: "osago", startDate: "2026-01-01", durationMonths: 12 }],
      serviceRecords: [{ id: "restore-service", vehicleId: "restore-car", title: "Restored service", date: "2026-01-01", mileage: 1234, description: "Backup restore test" }],
      fuelRecords: [],
      oemSchedules: [],
      garageParts: [],
      toFixTasks: [],
      tuningStages: [],
    };

    const response = await request(receiver, "/api/backup/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(backup),
    });
    expect(response.status).toBe(200);

    const receiverDataResponse = await request(receiver, "/api/data");
    expect(receiverDataResponse.status).toBe(200);
    const receiverData = await receiverDataResponse.json() as Record<string, Array<{ id?: string; model?: string; title?: string }>>;
    expect(receiverData.vehicles).toEqual([expect.objectContaining({ id: "restore-car", model: "RestoreIsolation" })]);
    expect(receiverData.reminders).toEqual([expect.objectContaining({ id: "restore-reminder" })]);
    expect(receiverData.serviceRecords).toEqual([expect.objectContaining({ id: "restore-service", title: "Restored service" })]);

    const unrelatedData = await (await request(unrelated, "/api/data")).json() as Record<string, unknown[]>;
    for (const key of ["vehicles", "reminders", "serviceRecords", "fuelRecords", "oemSchedules", "garageParts", "toFixTasks", "tuningStages"]) {
      expect(unrelatedData[key], `backup import must not change unrelated user's ${key}`).toEqual([]);
    }

    const invalid = await request(receiver, "/api/backup/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vehicles: [], serviceRecords: [{ id: "orphan-service", vehicleId: "missing-vehicle" }] }),
    });
    expect(invalid.status).toBe(400);
    const afterInvalidData = await (await request(receiver, "/api/data")).json() as Record<string, Array<{ id?: string }>>;
    expect(afterInvalidData.vehicles).toEqual([expect.objectContaining({ id: "restore-car" })]);
    expect(afterInvalidData.serviceRecords).toEqual([expect.objectContaining({ id: "restore-service" })]);

    const exportResponse = await request(receiver, "/api/backup/export");
    expect(exportResponse.status).toBe(200);
    const exported = await exportResponse.json() as { vehicles: Array<{ id: string }> };
    expect(exported.vehicles).toEqual([expect.objectContaining({ id: "restore-car" })]);
  });

  it("blocks paid agent requests from users outside the configured allowlist", async () => {
    const unlisted = await register("unlisted-agent-user");
    const response = await request(unlisted, "/api/agents/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task: "Review this project", agents: ["qa"] }),
    });
    expect(response.status).toBe(403);
  });

  it("validates agent proxy requests before contacting the private service", async () => {
    const owner = await register("agent-proxy-validation");
    const shortTask = await request(owner, "/api/agents/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task: "x" }),
    });
    expect(shortTask.status).toBe(400);

    const emptySelection = await request(owner, "/api/agents/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task: "Review this project", agents: [] }),
    });
    expect(emptySelection.status).toBe(400);

    const tooManyAgents = await request(owner, "/api/agents/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task: "Review this project", agents: ["architect", "developer", "qa", "ops"] }),
    });
    expect(tooManyAgents.status).toBe(400);

    const unknownAgent = await request(owner, "/api/agents/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task: "Review this project", agents: ["unknown-agent"] }),
    });
    expect(unknownAgent.status).toBe(400);
  });

  it("returns conflict when two registrations race for the same username", async () => {
    const createAccount = () => fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ username: "concurrent-signup", password: "TestPassword-123!" }),
    });

    const responses = await Promise.all([createAccount(), createAccount()]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const bodies = await Promise.all(responses.map((response) => response.json() as Promise<{ error?: string }>));
    expect(bodies.some((body) => body.error === "Пользователь с таким логином уже существует")).toBe(true);
  });

  it("does not drop records when one user creates vehicles concurrently", async () => {
    const owner = await register("concurrent-owner");
    const makeVehicleRequest = (model: string) => request(owner, "/api/vehicles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ make: "Toyota", model, year: 2023, currentMileage: 5000 }),
    });

    const [first, second] = await Promise.all([
      makeVehicleRequest("ConcurrentCarA"),
      makeVehicleRequest("ConcurrentCarB"),
    ]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const listResponse = await request(owner, "/api/vehicles");
    expect(listResponse.status).toBe(200);
    const vehicles = await listResponse.json() as Array<{ model: string }>;
    expect(vehicles.map((item) => item.model)).toEqual(expect.arrayContaining(["ConcurrentCarA", "ConcurrentCarB"]));
    expect(vehicles).toHaveLength(2);
  });


  it("round-trips a valid backup and reset affects only the signed-in user's garage", async () => {
    const owner = await register("backup-roundtrip-owner");
    const other = await register("backup-roundtrip-other");

    const created = await request(owner, "/api/vehicles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "backup-car", make: "Mazda", model: "BackupRoundTrip", year: 2022, currentMileage: 42000 }),
    });
    expect(created.status).toBe(201);

    const exportResponse = await request(owner, "/api/backup/export");
    expect(exportResponse.status).toBe(200);
    const backup = await exportResponse.json() as { vehicles: Array<{ id: string; model: string }> };
    expect(backup.vehicles).toEqual([expect.objectContaining({ id: "backup-car", model: "BackupRoundTrip" })]);

    const resetResponse = await request(owner, "/api/backup/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(resetResponse.status).toBe(200);
    expect(await (await request(owner, "/api/vehicles")).json()).toEqual([]);
    expect(await (await request(other, "/api/vehicles")).json()).toEqual([]);

    const importResponse = await request(owner, "/api/backup/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(backup),
    });
    expect(importResponse.status).toBe(200);
    expect(await (await request(owner, "/api/vehicles")).json()).toEqual([
      expect.objectContaining({ id: "backup-car", model: "BackupRoundTrip" }),
    ]);
    expect(await (await request(other, "/api/vehicles")).json()).toEqual([]);
  });

});
