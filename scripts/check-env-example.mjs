import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplePath = path.join(repositoryRoot, ".env.example");
const values = new Map(
  fs.readFileSync(examplePath, "utf8")
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      return match ? [[match[1], match[2]]] : [];
    }),
);

// Runtime settings that operators may need to configure. Benchmark-only and
// diagnostic variables are intentionally excluded, so this contract stays
// focused on application deployment rather than local experiments.
const requiredKeys = [
  "NODE_ENV", "PORT", "APP_URL", "GARAGE_PUBLIC_URL", "TRUSTED_PROXY_HOPS", "ALLOWED_ORIGINS",
  "DATABASE_URL", "DATABASE_HOST", "DATABASE_PORT", "DATABASE_SSL",
  "DATABASE_POOL_MAX", "DATABASE_AUTO_MIGRATE", "GARAGE_POSTGRES_READY",
  "GARAGE_ALLOW_EPHEMERAL_STORAGE", "GARAGE_DB_FILE", "GARAGE_SESSIONS_FILE",
  "RESEND_API_KEY", "EMAIL_FROM", "EMAIL_CODE_SECRET",
  "GEMINI_API_KEY", "GOOGLE_GENAI_USE_VERTEXAI", "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_LOCATION", "DOCUMENT_AI_LOCATION", "DOCUMENT_AI_OCR_PROCESSOR_ID",
  "DOCUMENT_AI_DOCUMENT_PROCESSOR_ID", "DOCUMENT_AI_FORM_PROCESSOR_ID",
  "OPENROUTER_API_KEY", "OPENROUTER_RECEIPT_API_KEY", "OPENROUTER_DOCUMENT_API_KEY",
  "OPENROUTER_DOCUMENT_REFINEMENT_ENABLED", "AGENTS_SERVICE_URL",
  "AGENTS_SERVICE_AUDIENCE", "AGENTS_API_TOKEN", "AGENTS_ALLOWED_USERNAMES",
];

const missing = requiredKeys.filter((key) => !values.has(key));
if (missing.length) {
  throw new Error(`.env.example is missing deployment settings: ${missing.join(", ")}`);
}

const unsafeDefaults = ["RESEND_API_KEY", "EMAIL_CODE_SECRET", "AGENTS_API_TOKEN", "DATABASE_URL"]
  .filter((key) => (values.get(key) ?? "").trim());
if (unsafeDefaults.length) {
  throw new Error(`.env.example must not contain credential defaults: ${unsafeDefaults.join(", ")}`);
}

console.log(JSON.stringify({ status: "ok", checkedKeys: requiredKeys.length }));
