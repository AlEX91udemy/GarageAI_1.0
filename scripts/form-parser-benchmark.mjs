import fs from "node:fs/promises";
import dotenv from "dotenv";
import { v1 as documentai } from "@google-cloud/documentai";

dotenv.config();
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.DOCUMENT_AI_LOCATION || "eu";
const processorId = process.env.DOCUMENT_AI_FORM_PROCESSOR_ID;
const limit = Number(process.env.FORM_BENCH_LIMIT || 10);
const reportPath = new URL("../artifacts/form-parser-benchmark-report.json", import.meta.url);
function norm(value) { return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, " ").trim(); }
function digits(value) { return String(value ?? "").replace(/\\D/g, ""); }
function valuesMatch(expected, actual, key) {
  if (!expected || !actual) return false;
  if (key === "total") return digits(expected) === digits(actual);
  const left = norm(expected).split(" ").filter(Boolean); const right = new Set(norm(actual).split(" ").filter(Boolean));
  return left.length > 0 && left.filter((token) => right.has(token)).length / left.length >= 0.7;
}
async function rows(dataset, split, count) {
  const url = "https://datasets-server.huggingface.co/rows?dataset=" + encodeURIComponent(dataset) + "&config=default&split=" + split + "&offset=0&length=" + count;
  const response = await fetch(url); if (!response.ok) throw new Error("Dataset request failed: HTTP " + response.status); return (await response.json()).rows || [];
}
async function image(src) {
  const response = await fetch(src); if (!response.ok) throw new Error("Image request failed: HTTP " + response.status);
  return { content: Buffer.from(await response.arrayBuffer()), mimeType: response.headers.get("content-type")?.split(";")[0] || "image/jpeg" };
}
function textFromAnchor(anchor, text) { return (anchor?.textSegments || []).map((segment) => text.slice(Number(segment.startIndex || 0), Number(segment.endIndex || 0))).join("").trim(); }
async function processSample(client, sample, index) {
  try {
    const raw = await image(sample.image.src); const name = "projects/" + projectId + "/locations/" + location + "/processors/" + processorId;
    const [response] = await client.processDocument({ name, rawDocument: raw }); const document = response.document || {};
    const fields = (document.pages || []).flatMap((page) => (page.formFields || []).map((field) => ({ name: textFromAnchor(field.fieldName?.textAnchor, document.text || ""), value: textFromAnchor(field.fieldValue?.textAnchor, document.text || ""), nameConfidence: field.fieldName?.confidence ?? null, valueConfidence: field.fieldValue?.confidence ?? null })));
    const expected = sample.entities || {}; const candidates = { company: fields.find((field) => /supplier|company|merchant|vendor/i.test(field.name)), date: fields.find((field) => /date/i.test(field.name)), total: fields.find((field) => /total|amount/i.test(field.name)) };
    const matches = Object.entries(candidates).filter(([key, field]) => valuesMatch(expected[key], field?.value, key)).map(([key]) => key); const confidenceValues = fields.map((field) => field.valueConfidence).filter((value) => Number.isFinite(value));
    return { index, ok: true, expected, fields, matchedKeys: matches, matchedCount: matches.length, expectedCount: 3, averageValueConfidence: confidenceValues.length ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : null };
  } catch (error) { return { index, ok: false, error: String(error?.message || error).split("\\n")[0] }; }
}
if (!processorId) {
  const report = { status: "not_configured", reason: "DOCUMENT_AI_FORM_PROCESSOR_ID is not set", projectId: projectId || null, location, attempted: 0, results: [] };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ ...report, report: "artifacts/form-parser-benchmark-report.json" }, null, 2));
} else if (!projectId) throw new Error("GOOGLE_CLOUD_PROJECT is required when DOCUMENT_AI_FORM_PROCESSOR_ID is set");
else {
  const client = new documentai.DocumentProcessorServiceClient({ apiEndpoint: location + "-documentai.googleapis.com" }); const samples = await rows("jsdnrs/ICDAR2019-SROIE", "test", limit); const results = [];
  for (let i = 0; i < samples.length; i += 1) results.push(await processSample(client, samples[i].row, i + 1));
  const matched = results.reduce((sum, result) => sum + (result.matchedCount || 0), 0); const expected = results.reduce((sum, result) => sum + (result.expectedCount || 0), 0); const confidence = results.map((result) => result.averageValueConfidence).filter((value) => Number.isFinite(value));
  const report = { status: "completed", generatedAt: new Date().toISOString(), projectId, location, processorId, attempted: results.length, succeeded: results.filter((result) => result.ok).length, matched, expected, keyValueAccuracyPercent: expected ? 100 * matched / expected : 0, averageValueConfidence: confidence.length ? confidence.reduce((sum, value) => sum + value, 0) / confidence.length : null, results };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2)); await client.close(); console.log(JSON.stringify({ ...report, report: "artifacts/form-parser-benchmark-report.json" }, null, 2));
}
