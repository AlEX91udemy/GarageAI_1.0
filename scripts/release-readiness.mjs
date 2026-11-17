import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
function command(name, commandLine, args) {
  const result = spawnSync(commandLine, args, { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  checks.push({ name, status: result.status === 0 ? "passed" : "failed", command: [commandLine, ...args].join(" "), output: output.slice(-1200) });
}
function fileEvidence(name, relativePath, predicate) {
  const target = path.join(root, relativePath);
  let status = "failed";
  let output = "file missing";
  try {
    const content = fs.readFileSync(target, "utf8");
    status = predicate(content) ? "passed" : "failed";
    output = status === "passed" ? "required evidence present" : "required evidence missing";
  } catch (error) { output = error instanceof Error ? error.message : "read failed"; }
  checks.push({ name, status, command: relativePath, output });
}
command("TypeScript", "npm", ["run", "lint"]);
command("Unit tests", "npm", ["test"]);
command("Production build", "npm", ["run", "build"]);
command("Environment contract", "npm", ["run", "config:check"]);
command("Production dependency audit", "npm", ["audit", "--omit=dev"]);
command("Catalog audit", "npm", ["run", "catalog:audit"]);
command("Python syntax", "python", ["-m", "compileall", "-q", "agents_service"]);
command("Worker dry run", "npx", ["--yes", "wrangler@4.152.0", "deploy", "--dry-run"]);
if (process.env.GARAGE_PUBLIC_URL?.trim()) command("Public health", "npm", ["run", "release:verify-health"]);
else checks.push({ name: "Public health", status: "pending", command: "GARAGE_PUBLIC_URL=<https-url> npm run release:verify-health", output: "GARAGE_PUBLIC_URL is not configured" });
fileEvidence("Release evidence", "docs/release-evidence-2026-11-14.md", (content) => content.includes("Still open release gates"));
fileEvidence("Scanner gate plan", "tasks/scanner-verification-plan-2026-11-14.md", (content) => content.includes("минимум из 30") && content.includes("ручной smoke-test"));
fileEvidence("History remediation runbook", "docs/git-history-secret-remediation.md", (content) => content.includes("Gitleaks"));
const externalPending = ["Cloudflare Workers Builds owner log and repair", "DNS aliases and TLS verification", "Authenticated Vertex/private-agent smoke", "Independent mailbox delivery and full email flow", "OCR regression set with ground truth and device smoke", "Legacy bundle provenance and privacy sign-off", "Post-rollout observation window with thresholds", "Approved Git history rewrite and secret/session rotation"];
const passed = checks.filter((check) => check.status === "passed").length;
const failed = checks.filter((check) => check.status === "failed").length;
const pending = checks.filter((check) => check.status === "pending").length;
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), status: failed ? "blocked-by-local-checks" : "external-gates-pending", summary: { passed, failed, pending, externalPending: externalPending.length }, checks, externalPending }, null, 2));
process.exitCode = failed ? 1 : 0;
