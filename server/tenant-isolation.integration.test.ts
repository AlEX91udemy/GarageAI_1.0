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
    child = spawn(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "server.ts"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: String(port),
          GARAGE_DB_FILE: path.join(tempDir, "garage_store.json"),
          GARAGE_SESSIONS_FILE: path.join(tempDir, "sessions.json"),
          GEMINI_API_KEY: "",
          OPENROUTER_API_KEY: "",
          ALLOWED_ORIGINS: baseUrl,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.stdout.on("data", (chunk) => { childOutput += String(chunk); });
    child.stderr.on("data", (chunk) => { childOutput += String(chunk); });
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

    const bobBackup = await request(bob, "/api/backup/export");
    expect(bobBackup.status).toBe(200);
    const backupText = await bobBackup.text();
    expect(backupText).not.toContain(aliceVehicle.id);
    expect(backupText).not.toContain("IsolationTest");

    const aliceList = await request(alice, "/api/vehicles");
    expect(aliceList.status).toBe(200);
    expect(await aliceList.json()).toEqual([expect.objectContaining({ id: aliceVehicle.id, model: "IsolationTest" })]);
  });
});
