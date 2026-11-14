import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";
import { v1 as documentai } from "@google-cloud/documentai";
import { createWorker, OEM, PSM } from "tesseract.js";

dotenv.config();

const sampleCount = Math.max(1, Math.min(5, Number(process.env.OCR_BENCH_SAMPLES || 2)));
const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
const vertexEnabled = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" && Boolean(project);
const geminiKeyConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
const openRouterDocumentKeyConfigured = Boolean(process.env.OPENROUTER_DOCUMENT_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim());
const outputPath = path.resolve(process.cwd(), "artifacts/ocr-provider-benchmark.json");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const benchmarkInfo = { sampleCountPerDataset: sampleCount, receipts: "jsdnrs/ICDAR2019-SROIE test", documents: "tejasvaidhya/FUNSD test", storesImageBytes: false, storesRecognizedText: false };

async function writeCheckpoint() {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), benchmark: benchmarkInfo, providers: providerResults }, null, 2) + "\n", "utf8");
}

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function tokenCounts(value) {
  const counts = new Map();
  for (const token of normalize(value).split(/\s+/).filter(Boolean)) counts.set(token, (counts.get(token) || 0) + 1);
  return counts;
}

function tokenOverlap(expected, actual) {
  const expectedCounts = tokenCounts(expected);
  const actualCounts = tokenCounts(actual);
  let matched = 0;
  let total = 0;
  for (const [token, count] of expectedCounts) {
    total += count;
    matched += Math.min(count, actualCounts.get(token) || 0);
  }
  return { matched, total };
}

function editDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[right.length];
}

function dateKey(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length ? digits : "";
}

function amountKey(value) {
  const matches = String(value ?? "").match(/\d[\d .,]*/g) || [];
  return matches.map((item) => item.replace(/\D/g, "")).filter(Boolean).sort((a, b) => b.length - a.length)[0] || "";
}

function dateCandidates(text) {
  return String(text ?? "").match(/\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/g) || [];
}

function amountCandidates(text) {
  return String(text ?? "").match(/\b\d{1,7}(?:[ ,. ]\d{3})*(?:[.,]\d{2})\b|\b\d{1,7}\b/g) || [];
}

async function getRows(dataset, split) {
  const url = new URL("https://datasets-server.huggingface.co/rows");
  url.search = new URLSearchParams({ dataset, config: "default", split, offset: "0", length: String(sampleCount) }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`dataset_http_${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.rows) || data.rows.length < sampleCount) throw new Error("dataset_rows_missing");
  return data.rows.map((item) => item.row);
}

async function loadImage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`image_http_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 10_000_000) throw new Error("image_size_invalid");
  let mimeType = response.headers.get("content-type")?.split(";")[0] || "";
  if (!mimeType.startsWith("image/")) {
    const metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
    const formats = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", tiff: "image/tiff", gif: "image/gif", bmp: "image/bmp" };
    mimeType = formats[metadata.format] || "";
  }
  if (!mimeType.startsWith("image/")) throw new Error("image_mime_invalid");
  return { bytes, mimeType };
}

function getSroieExpected(row) {
  const entities = row.entities || {};
  return {
    company: String(entities.company || ""),
    date: String(entities.date || ""),
    total: String(entities.total || ""),
  };
}

function scoreReceipt(expected, actual) {
  const expectedCompany = normalize(expected.company);
  const actualCompany = normalize(actual.company);
  const companyTokens = tokenOverlap(expectedCompany, actualCompany);
  const companyOk = companyTokens.total > 0 && companyTokens.matched / companyTokens.total >= 0.7;
  const expectedDate = dateKey(expected.date);
  const actualDate = (Array.isArray(actual.date) ? actual.date : [actual.date]).map(dateKey);
  const expectedTotal = amountKey(expected.total);
  const actualTotal = (Array.isArray(actual.total) ? actual.total : [actual.total]).map(amountKey);
  const expectedFields = [expected.company, expectedDate, expectedTotal].filter(Boolean).length;
  return {
    matched: Number(companyOk) + Number(Boolean(expectedDate && actualDate.includes(expectedDate))) + Number(Boolean(expectedTotal && actualTotal.includes(expectedTotal))),
    fields: expectedFields,
  };
}

function sroieEntity(document, candidates) {
  const entities = document.entities || [];
  const entity = entities.find((item) => candidates.some((candidate) => (item.type || "").toLowerCase().includes(candidate)));
  return entity?.normalizedValue?.text || entity?.mentionText || "";
}

function sroieEntityCandidates(document, candidates) {
  const entities = document.entities || [];
  const entity = entities.find((item) => candidates.some((candidate) => (item.type || "").toLowerCase().includes(candidate)));
  return [entity?.normalizedValue?.text, entity?.mentionText].filter(Boolean);
}

function scoreDocument(expected, actual) {
  const overlap = tokenOverlap(expected, actual);
  const expectedText = normalize(expected);
  const actualText = normalize(actual);
  return {
    wordMatched: overlap.matched,
    wordCount: overlap.total,
    characterErrors: editDistance(expectedText, actualText),
    characterCount: expectedText.length,
  };
}

async function runSeries(provider, type, samples, scan) {
  const perSample = [];
  for (let index = 0; index < samples.length; index += 1) {
    const row = samples[index];
    const startedAt = performance.now();
    try {
      const image = await loadImage(row.image.src);
      const result = await scan(image, row);
      const metrics = type === "receipt"
        ? scoreReceipt(getSroieExpected(row), result.actual)
        : scoreDocument(row.ocr_annotation_texts || "", result.text || "");
      perSample.push({ index: index + 1, ok: true, latencyMs: Math.round(performance.now() - startedAt), ...metrics });
    } catch (error) {
      perSample.push({ index: index + 1, ok: false, latencyMs: Math.round(performance.now() - startedAt), errorCode: classifyError(error) });
    }
    await sleep(300);
  }
  return summarize(provider, type, perSample);
}

function classifyError(error) {
  const message = String(error?.message || error).toLowerCase();
  if (/credential|unauthenticated|permission|forbidden|api key|not configured/.test(message)) return "auth_or_permission";
  if (/quota|rate|429|resource_exhausted/.test(message)) return "quota_or_rate_limit";
  if (/timeout|deadline|aborted/.test(message)) return "timeout";
  if (/dataset|image_http|image_size|image_mime/.test(message)) return "fixture_fetch_or_validation";
  if (/404|not found|publisher model/.test(message)) return "model_or_processor_not_found";
  return "provider_error";
}

function summarize(provider, type, samples) {
  const ok = samples.filter((item) => item.ok);
  const sum = (key) => ok.reduce((total, item) => total + (item[key] || 0), 0);
  const summary = {
    provider,
    type,
    attempted: samples.length,
    succeeded: ok.length,
    failed: samples.length - ok.length,
    latencyMs: {
      average: ok.length ? Math.round(sum("latencyMs") / ok.length) : null,
      max: ok.length ? Math.max(...ok.map((item) => item.latencyMs)) : null,
    },
  };
  if (type === "receipt") {
    summary.matchedFields = sum("matched");
    summary.totalFields = sum("fields");
    summary.fieldAccuracyPercent = summary.totalFields ? Number((100 * summary.matchedFields / summary.totalFields).toFixed(2)) : null;
  } else {
    summary.wordMatched = sum("wordMatched");
    summary.wordCount = sum("wordCount");
    summary.wordRecallPercent = summary.wordCount ? Number((100 * summary.wordMatched / summary.wordCount).toFixed(2)) : null;
    summary.characterErrors = sum("characterErrors");
    summary.characterCount = sum("characterCount");
    summary.characterErrorRatePercent = summary.characterCount ? Number((100 * summary.characterErrors / summary.characterCount).toFixed(2)) : null;
  }
  summary.failures = samples.filter((item) => !item.ok).map(({ index, errorCode }) => ({ index, errorCode }));
  return summary;
}

const providerResults = [];
let receiptRows = [];
let documentRows = [];
try {
  [receiptRows, documentRows] = await Promise.all([
    getRows("jsdnrs/ICDAR2019-SROIE", "test"),
    getRows("tejasvaidhya/FUNSD", "test"),
  ]);
} catch (error) {
  providerResults.push({
    provider: "fixtures",
    available: false,
    reason: classifyError(error),
  });
}

const tesseractLanguages = process.env.OCR_LANGUAGES || "rus+eng";
let tesseractWorker;
try {
  tesseractWorker = await createWorker(tesseractLanguages, OEM.LSTM_ONLY, { logger: () => undefined });
  await tesseractWorker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: "1", user_defined_dpi: "300" });
  const tesseractScan = async (image) => {
    const prepared = await sharp(image.bytes, { limitInputPixels: 40_000_000 }).rotate().flatten({ background: "#ffffff" }).resize({ width: 2200, height: 4000, fit: "inside" }).grayscale().normalize().png().toBuffer();
    const result = await tesseractWorker.recognize(prepared);
    return { text: result.data.text || "", confidence: result.data.confidence };
  };
  providerResults.push(await runSeries(`tesseract:${tesseractLanguages}`, "receipt", receiptRows, async (image) => {
    const result = await tesseractScan(image);
    const lines = result.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return { actual: { company: lines.slice(0, 3).join(" "), date: dateCandidates(result.text), total: amountCandidates(result.text) } };
  }));
  await writeCheckpoint();
  providerResults.push(await runSeries(`tesseract:${tesseractLanguages}`, "document", documentRows, async (image) => ({ text: (await tesseractScan(image)).text })));
  await writeCheckpoint();
} catch (error) {
  providerResults.push({ provider: `tesseract:${tesseractLanguages}`, available: false, reason: classifyError(error) });
} finally {
  await tesseractWorker?.terminate();
}

if (vertexEnabled || geminiKeyConfigured) {
  const vertex = vertexEnabled;
  const model = process.env.OCR_BENCH_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  let genai;
  try {
    genai = new GoogleGenAI(vertex
      ? { vertexai: true, project, location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1" }
      : { apiKey: process.env.GEMINI_API_KEY });
  } catch (error) {
    providerResults.push({ provider: vertex ? `vertex:${model}` : `gemini-api:${model}`, available: false, reason: classifyError(error) });
  }
  const geminiScan = async (image, row, task) => {
    const prompt = task === "receipt"
      ? "Read this receipt. Return JSON only with company, date, total, and fullText. Preserve the printed values. Use empty strings for unreadable fields."
      : "Transcribe every visible word in reading order. Return JSON only with a single text field. Do not summarize or translate.";
    const response = await genai.models.generateContent({
      model,
      contents: { parts: [{ inlineData: { data: image.bytes.toString("base64"), mimeType: image.mimeType } }, { text: prompt }] },
      config: { responseMimeType: "application/json", temperature: 0 },
    });
    let parsed;
    try { parsed = JSON.parse(response.text || "{}"); } catch { throw new Error("invalid_provider_response"); }
    return task === "receipt"
      ? { actual: { company: parsed.company || "", date: parsed.date || "", total: parsed.total || "" } }
      : { text: parsed.text || "" };
  };
  if (genai) {
    const provider = vertex ? `vertex:${model}` : `gemini-api:${model}`;
    providerResults.push(await runSeries(provider, "receipt", receiptRows, (image, row) => geminiScan(image, row, "receipt")));
    await writeCheckpoint();
    providerResults.push(await runSeries(provider, "document", documentRows, (image, row) => geminiScan(image, row, "document")));
    await writeCheckpoint();
    await genai.close?.();
  }
} else {
  providerResults.push({ provider: "gemini", available: false, reason: "credentials_missing" });
}

const processorLocation = process.env.DOCUMENT_AI_LOCATION || "us";
const receiptProcessor = process.env.DOCUMENT_AI_RECEIPT_PROCESSOR_ID?.trim();
const documentProcessor = (process.env.DOCUMENT_AI_OCR_PROCESSOR_ID || process.env.DOCUMENT_AI_DOCUMENT_PROCESSOR_ID)?.trim();
if (project && (receiptProcessor || documentProcessor)) {
  const client = new documentai.DocumentProcessorServiceClient({ apiEndpoint: `${processorLocation}-documentai.googleapis.com` });
  let enabledProcessorIds = new Set();
  try {
    const [processors] = await client.listProcessors({ parent: "projects/" + project + "/locations/" + processorLocation });
    enabledProcessorIds = new Set((processors || []).filter((item) => item.state === "ENABLED").map((item) => String(item.name || "").split("/").at(-1)));
  } catch {
    providerResults.push({ provider: "document-ai", available: false, reason: "processor_inventory_unavailable" });
  }
  const runProcessor = async (processorId, kind, rows) => {
    if (!processorId) return { provider: "document-ai", type: kind, available: false, reason: "processor_id_missing" };
    if (!enabledProcessorIds.has(processorId)) return { provider: "document-ai", type: kind, attempted: 0, available: false, reason: "processor_missing_or_disabled" };
    const processorName = `projects/${project}/locations/${processorLocation}/processors/${processorId}`;
    return runSeries("document-ai", kind, rows, async (image) => {
      const [result] = await client.processDocument({ name: processorName, rawDocument: { content: image.bytes.toString("base64"), mimeType: image.mimeType } });
      const document = result.document || {};
      return kind === "receipt"
        ? { actual: { company: sroieEntity(document, ["supplier_name", "merchant_name", "supplier"]), date: sroieEntityCandidates(document, ["receipt_date", "date"]), total: sroieEntityCandidates(document, ["total_amount", "total"]) } }
        : { text: document.text || "" };
    });
  };
  providerResults.push(await runProcessor(receiptProcessor, "receipt", receiptRows));
  await writeCheckpoint();
  providerResults.push(await runProcessor(documentProcessor, "document", documentRows));
  await writeCheckpoint();
  await client.close();
} else {
  providerResults.push({ provider: "document-ai", available: false, reason: "project_or_processor_missing" });
}

providerResults.push({ provider: "openrouter", available: openRouterDocumentKeyConfigured, reason: openRouterDocumentKeyConfigured ? "not_included_in_this_google_provider_benchmark" : "credentials_missing" });
const report = {
  generatedAt: new Date().toISOString(),
  benchmark: benchmarkInfo,
  providers: providerResults,
};
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ report: path.relative(process.cwd(), outputPath), benchmark: report.benchmark, providers: providerResults }, null, 2));
