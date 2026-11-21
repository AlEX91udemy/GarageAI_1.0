import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import postgres from "postgres";
import net from "node:net";
import { hashToken } from "../server/security";

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

async function startServer(
  port: number,
  connectionString: string,
  emailCaptureFile: string,
  agentUrl: string,
  agentAllowlist: string,
): Promise<ChildProcess> {
  const child = spawn(process.execPath, ["dist/server.cjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      DISABLE_HMR: "true",
      PORT: String(port),
      DATABASE_URL: connectionString,
      DATABASE_HOST: "",
      DATABASE_PORT: "",
      GARAGE_POSTGRES_READY: "true",
      DATABASE_AUTO_MIGRATE: "false",
      DATABASE_SSL: process.env.DATABASE_SSL ?? "false",
      EMAIL_CODE_SECRET: "postgres-http-test-email-secret",
      EMAIL_CODE_CAPTURE_FILE: emailCaptureFile,
      TRUSTED_PROXY_HOPS: "0",
      AGENTS_SERVICE_URL: agentUrl,
      AGENTS_API_TOKEN: "postgres-http-test-agent-token",
      AGENTS_ALLOWED_USERNAMES: agentAllowlist,
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
        return child;
      }
    } catch {
      // The server has not started listening yet.
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

async function register(baseUrl: string, username: string, password: string, emailCaptureFile: string) {
  const email = `${username}@example.test`;
  const { response, body } = await requestJson(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  assert(response.status === 202 && body.pendingEmailVerification === true, "registration failed with HTTP " + response.status);
  const lines = fs.existsSync(emailCaptureFile) ? fs.readFileSync(emailCaptureFile, "utf8").trim().split(/\r?\n/).filter(Boolean) : [];
  const captured = lines.map((line) => JSON.parse(line) as { email: string; code: string }).reverse().find((item) => item.email === email);
  assert(captured, "registration did not capture email code");
  const verified = await requestJson(baseUrl, "/api/auth/email/verify", { method: "POST", body: JSON.stringify({ email, code: captured.code }) });
  assert(verified.response.status === 200 && typeof verified.body.session?.csrfToken === "string", "email verification failed with HTTP " + verified.response.status);
  const cookie = (verified.response.headers.get("set-cookie") || "").split(";")[0];
  assert(cookie.startsWith("garagehub_session="), "verification did not set session cookie");
  return { cookie, csrfToken: verified.body.session.csrfToken as string };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for HTTP integration tests");
  const databaseUrl = URL.parse(connectionString);
  assert(databaseUrl && ["postgres:", "postgresql:"].includes(databaseUrl.protocol) &&
    ["127.0.0.1", "localhost"].includes(databaseUrl.hostname),
    "Use a disposable local PostgreSQL database for HTTP integration tests");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const userA = { username: `httpa-${suffix}`, password: "GarageAI-test-password-2026" };
  const userB = { username: `httpb-${suffix}`, password: "GarageAI-test-password-2026" };
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const emailCaptureFile = path.join(process.env.TEMP || process.env.TMP || ".", `garageai-email-codes-${suffix}.ndjson`);
  const db = postgres(connectionString, {
    max: 1, prepare: false,
    ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
  });
  let agentCalls = 0;
  const expectAgentCalls = (count: number, message: string) => assert(agentCalls === count, message);
  const agent = createServer((req, res) => {
    agentCalls += 1;
    req.resume();
    const isRun = req.method === "POST" && req.url === "/agents/run";
    res.writeHead(isRun ? 200 : 404, { "content-type": "application/json" });
    res.end(JSON.stringify({ task: "Review test project", results: { qa: "OK" } }));
  });
  const emails = [userA, userB].map(({ username }) => username + "@example.test");
  const agentBuckets: string[] = [];
  let child: ChildProcess | undefined;
  let peer: ChildProcess | undefined;

  try {
    agent.listen(0, "127.0.0.1");
    await once(agent, "listening");
    const agentAddress = agent.address();
    assert(agentAddress && typeof agentAddress !== "string", "agent stub has no TCP address");
    const agentUrl = "http://127.0.0.1:" + agentAddress.port;
    const agentAllowlist = [userA.username, userB.username, ...emails].join(",");
    const startApi = (apiPort: number, url = connectionString) =>
      startServer(apiPort, url, emailCaptureFile, agentUrl, agentAllowlist);
    child = await startApi(port);
    const authA = await register(baseUrl, userA.username, userA.password, emailCaptureFile);
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

    const authB = await register(baseUrl, userB.username, userB.password, emailCaptureFile);
    const garageB = await requestJson(baseUrl, "/api/vehicles", { headers: { cookie: authB.cookie } });
    assert(garageB.response.status === 200 && Array.isArray(garageB.body) && garageB.body.length === 0,
      "user B must not see user A vehicle");

    const users = await db<{ id: string; email: string }[]>
      `SELECT id, email FROM garageai_users WHERE email IN (${emails[0]}, ${emails[1]})`;
    assert(users.length === 2, "test users were not stored in PostgreSQL");
    agentBuckets.push(...users.map(({ id }) => hashToken("user:" + id)));
    const userBRecord = users.find(({ email }) => email === emails[1]);
    assert(userBRecord, "test user B was not stored in PostgreSQL");
    const bucketB = hashToken("user:" + userBRecord.id);

    const peerPort = await freePort();
    const peerUrl = "http://127.0.0.1:" + peerPort;
    const peerDatabase = new URL(databaseUrl);
    peerDatabase.searchParams.set("lock_timeout", "1000");
    peer = await startApi(peerPort, peerDatabase.href);

    const launchAgent = (apiUrl: string, auth: typeof authA) => requestJson(apiUrl, "/api/agents/run", {
      method: "POST",
      headers: { cookie: auth.cookie, "x-csrf-token": auth.csrfToken },
      body: JSON.stringify({ task: "Review test project", agents: ["qa"] }),
    });
    const invalidAgentCsrf = await launchAgent(peerUrl, { ...authA, csrfToken: "invalid-csrf-token" });
    assert(invalidAgentCsrf.response.status === 403, "invalid CSRF must block agent launch");
    expectAgentCalls(0, "request with an invalid CSRF token must never reach the agent stub");

    const aiLimit = 20;
    for (let i = 0; i < aiLimit - 1; i += 1) {
      const allowed = await launchAgent(i % 2 === 0 ? baseUrl : peerUrl, authA);
      assert(allowed.response.status === 200 && allowed.body.results?.qa === "OK",
        "launch within the shared quota should reach the agent stub, received HTTP " + allowed.response.status);
    }
    const finalRequests = await Promise.all([launchAgent(baseUrl, authA), launchAgent(peerUrl, authA)]);
    const allowed = finalRequests.find(({ response }) => response.status === 200);
    const blocked = finalRequests.find(({ response }) => response.status === 429);
    assert(allowed?.body.results?.qa === "OK" && blocked && Number(blocked.response.headers.get("retry-after")) > 0,
      "when two API processes race for the last slot, only one should reach the agent and the other should get 429 with Retry-After");
    expectAgentCalls(aiLimit, "over-quota request must never reach the agent stub");

    const otherUser = await launchAgent(peerUrl, authB);
    assert(otherUser.response.status === 200, "exhausting one user's quota must not block a second user");
    expectAgentCalls(aiLimit + 1, "the second user's request should reach the agent stub");

    // Lock only B's AI bucket so authentication and garage reads can still succeed.
    await db.begin(async (tx) => {
      const buckets = await tx`SELECT 1 FROM garageai_rate_limits WHERE scope = 'ai' AND bucket_key = ${bucketB} FOR UPDATE`;
      assert(buckets.length === 1, "expected user B's AI bucket in PostgreSQL");
      const unavailable = await launchAgent(peerUrl, authB);
      assert(unavailable.response.status === 503 && unavailable.body.error === "AI-сервис временно недоступен.",
        "the rate-limit write timeout should return the standard AI 503 response");
      expectAgentCalls(aiLimit + 1, "rate-limit storage failure must never reach the agent stub");
    });

    const deleteB = await requestJson(baseUrl, "/api/auth/account", {
      method: "DELETE",
      headers: { cookie: authB.cookie, "x-csrf-token": authB.csrfToken },
      body: JSON.stringify({ password: userB.password }),
    });
    assert(deleteB.response.status === 200, "account deletion failed with HTTP " + deleteB.response.status);
    const deletedUserRows = await db`SELECT count(*)::integer AS count FROM garageai_users WHERE email = ${userB.username + "@example.test"}`;
    assert(Number(deletedUserRows[0]?.count ?? -1) === 0, "deleted account remained in PostgreSQL");
    const deletedSession = await requestJson(baseUrl, "/api/auth/session", { headers: { cookie: authB.cookie } });
    assert(deletedSession.response.status === 401, "deleted account session remained active");

    await stopServer(child);
    child = await startApi(port);
    const login = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: `${userA.username}@example.test`, password: userA.password }),
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

    console.log("PostgreSQL HTTP integration passed: auth, CSRF, tenant isolation, durable CRUD, restart, logout, shared agent quota, and quota storage failure.");
  } finally {
    await Promise.all([child, peer].map((api) => api && stopServer(api)));
    if (agent.listening) await new Promise<void>((resolve) => agent.close(() => resolve()));
    if (agentBuckets.length) {
      await db`DELETE FROM garageai_rate_limits WHERE scope = 'ai' AND bucket_key IN ${db(agentBuckets)}`.catch(() => undefined);
    }
    await db`DELETE FROM garageai_users WHERE email IN (${userA.username + "@example.test"}, ${userB.username + "@example.test"})`.catch(() => undefined);
    await db.end({ timeout: 5 });
    fs.rmSync(emailCaptureFile, { force: true });
  }
}

main().catch((error) => {
  console.error("PostgreSQL HTTP integration failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
