const configuredUrl = process.env.GARAGE_PUBLIC_URL?.trim();
if (!configuredUrl) throw new Error("GARAGE_PUBLIC_URL is required (for example https://garageai.site)");

let baseUrl: URL;
try {
  baseUrl = new URL(configuredUrl);
} catch {
  throw new Error("GARAGE_PUBLIC_URL must be an absolute HTTPS URL");
}
if (baseUrl.protocol !== "https:") throw new Error("GARAGE_PUBLIC_URL must use HTTPS");

const healthUrl = new URL("/api/health", baseUrl);
const response = await fetch(healthUrl, {
  headers: { accept: "application/json" },
  signal: AbortSignal.timeout(15_000),
});
if (!response.ok) throw new Error(`Public health endpoint returned HTTP ${response.status}`);

const payload: unknown = await response.json();
if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
  throw new Error("Public health endpoint must return a JSON object");
}
const record = payload as Record<string, unknown>;
if (record.status !== "ok" || typeof record.timestamp !== "string" || Number.isNaN(Date.parse(record.timestamp))) {
  throw new Error("Public health endpoint must return status=ok and an ISO timestamp");
}

const unexpectedKeys = Object.keys(record).filter((key) => !["status", "timestamp"].includes(key));
if (unexpectedKeys.length) {
  throw new Error(`Public health endpoint exposes unsupported fields: ${unexpectedKeys.join(", ")}`);
}

console.log(JSON.stringify({ status: "ok", endpoint: healthUrl.toString(), timestamp: record.timestamp }));
