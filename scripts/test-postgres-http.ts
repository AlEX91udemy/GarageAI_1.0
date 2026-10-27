import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import net from "node:net";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate test port"));
        return;
      }
      const port = address.port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5_000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    child.kill("SIGTERM");
  });
}

async function startServer(port: number, connectionString: string): Promise<ChildProcess> {
  const child = spawn(process.execPath, ["dist/server.cjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      DATABASE_URL: connectionString,
      GARAGE_POSTGRES_READY: "true",
      DATABASE_AUTO_MIGRATE: "false",
      DATABASE_SSL: process.env.DATABASE_SSL ?? "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout?.on("data", (chunk) => { logs = (logs + chunk.toString()).slice(-4_000); });
  child.stderr?.on("data", (chunk) => { logs = (logs + chunk.toString()).slice(-4_000); });
  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("Server exited before becoming healthy: " + logs.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted database URL]"));
    }
    try {
      const response = await fetch(baseUrl + "/api/health", { signal: AbortSignal.timeout(1_000) });
      if (response.ok) {
        const body = await response.json() as Record<string, unknown>;
        if (body.storageProvider !== "postgresql") throw new Error("Server did not select PostgreSQL storage");
        return child;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("did not select PostgreSQL")) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  await stopServer(child);
  throw new Error("Server health check timed out: " + logs.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted database URL]"));
}

async function requestJson(baseUrl: string, route: string, init: RequestInit = {}) {
  const response = await fetch(baseUrl + route, {
    ...init,
    signal: AbortSignal.timeout(5_000),
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
  const text = await response.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { /* keep empty body */ }
  return { response, body };
}

async function register(baseUrl: string, username: string, password: string) {
  const { response, body } = await requestJson(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  assert(response.status === 201, "registration failed with HTTP " + response.status);
  const cookie = (response.headers.get("set-cookie") || "").split(";")[0];
  assert(cookie.startsWith("garagehub_session="), "registration did not set session cookie");
  assert(typeof body.session?.csrfToken === "string", "registration did not return CSRF token");
  return { cookie, csrfToken: body.session.csrfToken as string };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for HTTP integration tests");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const userA = { username: `httpa-${suffix}`, password: "GarageAI-test-password-2026" };
  const userB = { username: `httpb-${suffix}`, password: "GarageAI-test-password-2026" };
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const db = postgres(connectionString, {
    max: 1, prepare: false,
    ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
  });
  let child: ChildProcess | undefined;

  try {
    child = await startServer(port, connectionString);
    const authA = await register(baseUrl, userA.username, userA.password);
    const initialA = await requestJson(baseUrl, "/api/vehicles", { headers: { cookie: authA.cookie } });
    assert(initialA.response.status === 200 && Array.isArray(initialA.body) && initialA.body.length === 0,
      "new account should have an empty garage");

    const invalidCsrf = await requestJson(baseUrl, "/api/vehicles", {
      method: "POST",
      headers: { cookie: authA.cookie, "x-csrf-token": "invalid-csrf-token" },
      body: JSON.stringify({ make: "CI", model: "ShouldNotPersist", year: 2026 }),
    });
    assert(invalidCsrf.response.status === 403, "invalid CSRF token should be rejected");

    const created = await requestJson(baseUrl, "/api/vehicles", {
      method: "POST",
      headers: { cookie: authA.cookie, "x-csrf-token": authA.csrfToken },
      body: JSON.stringify({ make: "CI", model: "Persistence", year: 2026 }),
    });
    assert(created.response.status === 201, "vehicle creation failed with HTTP " + created.response.status);
    const vehicleId = created.body.id;
    assert(typeof vehicleId === "string", "created vehicle has no ID");

    const authB = await register(baseUrl, userB.username, userB.password);
    const garageB = await requestJson(baseUrl, "/api/vehicles", { headers: { cookie: authB.cookie } });
    assert(garageB.response.status === 200 && Array.isArray(garageB.body) && garageB.body.length === 0,
      "user B must not see user A vehicle");

    await stopServer(child);
    child = await startServer(port, connectionString);
    const login = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: userA.username, password: userA.password }),
    });
    assert(login.response.status === 200, "login after restart failed with HTTP " + login.response.status);
    const loginCookie = (login.response.headers.get("set-cookie") || "").split(";")[0];
    const loginCsrf = login.body.session?.csrfToken;
    assert(loginCookie.startsWith("garagehub_session=") && typeof loginCsrf === "string",
      "login after restart did not establish a valid session");
    const loginBuckets = await db`SELECT count(*)::integer AS count FROM garageai_rate_limits WHERE scope = 'login'`;
    assert(Number(loginBuckets[0]?.count ?? -1) === 0,
      "successful login should clear the shared PostgreSQL login rate-limit bucket");

    const persisted = await requestJson(baseUrl, "/api/vehicles", { headers: { cookie: loginCookie } });
    assert(persisted.response.status === 200 && Array.isArray(persisted.body) &&
      persisted.body.length === 1 && persisted.body[0].id === vehicleId,
      "vehicle was not durable across server restart");

    const logout = await requestJson(baseUrl, "/api/auth/logout", {
      method: "POST",
      headers: { cookie: loginCookie, "x-csrf-token": loginCsrf },
      body: "{}",
    });
    assert(logout.response.status === 200, "logout failed with HTTP " + logout.response.status);
    const staleSession = await requestJson(baseUrl, "/api/auth/session", { headers: { cookie: loginCookie } });
    assert(staleSession.response.status === 401, "logged-out session remained active");

    console.log("PostgreSQL HTTP integration passed: auth, CSRF, tenant isolation, durable CRUD, restart, and logout.");
  } finally {
    if (child) await stopServer(child);
    await db`DELETE FROM garageai_users WHERE username IN (${userA.username}, ${userB.username})`.catch(() => undefined);
    await db.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("PostgreSQL HTTP integration failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
