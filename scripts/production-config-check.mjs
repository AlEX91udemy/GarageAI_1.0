const env = process.env;
const failures = [];
const warnings = [];
const has = (key) => typeof env[key] === "string" && env[key].trim().length > 0;

if (env.NODE_ENV !== "production") failures.push("NODE_ENV must be production");
if (!has("APP_URL") || !env.APP_URL.startsWith("https://")) failures.push("APP_URL must be an HTTPS URL");
if (!has("GARAGE_PUBLIC_URL") || !env.GARAGE_PUBLIC_URL.startsWith("https://")) failures.push("GARAGE_PUBLIC_URL must be an HTTPS URL");
if (!/^\d+$/.test(env.TRUSTED_PROXY_HOPS || "") || Number(env.TRUSTED_PROXY_HOPS) < 1) failures.push("TRUSTED_PROXY_HOPS must be at least 1 behind the production proxy");
if (env.GARAGE_ALLOW_EPHEMERAL_STORAGE === "true") failures.push("GARAGE_ALLOW_EPHEMERAL_STORAGE must be unset in production");
if (env.GARAGE_POSTGRES_READY !== "true") failures.push("GARAGE_POSTGRES_READY must be true after the controlled PostgreSQL cutover");
if (!has("DATABASE_URL")) failures.push("DATABASE_URL is required");
if (env.DATABASE_SSL !== "true") failures.push("DATABASE_SSL must be true for production PostgreSQL");
if (!has("EMAIL_FROM")) failures.push("EMAIL_FROM is required for email-code authentication");
if (!has("RESEND_API_KEY")) failures.push("RESEND_API_KEY is required for email-code authentication");
if (!has("EMAIL_CODE_SECRET")) failures.push("EMAIL_CODE_SECRET is required for email-code authentication");
const vertexReady = env.GOOGLE_GENAI_USE_VERTEXAI === "true" && has("GOOGLE_CLOUD_PROJECT");
const geminiReady = has("GEMINI_API_KEY");
if (!vertexReady && !geminiReady) failures.push("Vertex AI or GEMINI_API_KEY must be configured for diagnosis");
if (env.GOOGLE_GENAI_USE_VERTEXAI === "true" && !has("GOOGLE_CLOUD_PROJECT")) failures.push("GOOGLE_CLOUD_PROJECT is required when Vertex AI is enabled");
if (env.GOOGLE_GENAI_USE_VERTEXAI === "true" && !has("GOOGLE_CLOUD_LOCATION")) failures.push("GOOGLE_CLOUD_LOCATION is required when Vertex AI is enabled");
if (env.GOOGLE_CLOUD_PROJECT === "your-project-id") failures.push("GOOGLE_CLOUD_PROJECT still contains the .env.example placeholder");
if (!has("AGENTS_SERVICE_URL") || !has("AGENTS_SERVICE_AUDIENCE") || !has("AGENTS_API_TOKEN")) warnings.push("Private agent service is not fully configured; paid agents remain unavailable");
if (env.ALLOWED_ORIGINS?.split(",").some((origin) => origin.trim().startsWith("http://") && !origin.trim().includes("localhost"))) failures.push("ALLOWED_ORIGINS contains a non-local HTTP origin");
if (has("EMAIL_FROM")) {
  const sender = env.EMAIL_FROM.trim();
  const senderAddress = sender.match(/<([^<>@\s]+@[^<>@\s]+)>$/)?.[1] || sender;
  if (!/^[^<>@\s]+@[^<>@\s]+$/.test(senderAddress)) failures.push("EMAIL_FROM must contain a valid sender address");
}
if (has("APP_URL") && env.ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean).includes(env.APP_URL) === false) warnings.push("APP_URL is not listed in ALLOWED_ORIGINS");

const safe = {
  status: failures.length ? "failed" : "passed",
  failures,
  warnings,
  checks: { nodeEnv: env.NODE_ENV || "", appUrlConfigured: has("APP_URL"), publicUrlConfigured: has("GARAGE_PUBLIC_URL"), databaseConfigured: has("DATABASE_URL"), vertexConfigured: vertexReady, geminiConfigured: geminiReady, emailConfigured: has("RESEND_API_KEY") && has("EMAIL_FROM") && has("EMAIL_CODE_SECRET"), agentsConfigured: has("AGENTS_SERVICE_URL") && has("AGENTS_SERVICE_AUDIENCE") && has("AGENTS_API_TOKEN") },
};
console.log(JSON.stringify(safe, null, 2));
process.exitCode = failures.length ? 1 : 0;
