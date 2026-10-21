import fs from "node:fs/promises";
import dotenv from "dotenv";
import { v1 as documentai } from "@google-cloud/documentai";

dotenv.config();
const location = process.env.DOCUMENT_AI_LOCATION || "eu";
const client = new documentai.DocumentProcessorServiceClient({ apiEndpoint: `${location}-documentai.googleapis.com` });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function rows(dataset, split, limit) {
  const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=default&split=${split}&offset=0&length=${limit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Dataset ${dataset}: HTTP ${response.status}`);
  return (await response.json()).rows || [];
}

async function getImage(src) {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return { content: Buffer.from(await response.arrayBuffer()).toString("base64"), mimeType: mimeType.startsWith("image/") ? mimeType : "image/jpeg" };
}

function norm(value) { return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
function digits(value) { return String(value ?? "").replace(/\D/g, ""); }
function normalizedDate(value) {
  const raw = String(value ?? "").trim();
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return null;
}
function editDistance(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0]; previous[0] = i;
    for (let j = 1; j <= b.length; j++) { const above = previous[j]; previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)); diagonal = above; }
  }
  return previous[b.length];
}
function entityValue(doc, type) {
  const entity = (doc.entities || []).find(item => (item.type || "").toLowerCase().includes(type));
  return entity?.normalizedValue?.text || entity?.mentionText || null;
}
async function scan(processorId, sample, reference, kind, index) {
  try {
    const rawDocument = await getImage(sample.image.src);
    const name = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/${location}/processors/${processorId}`;
    const [result] = await client.processDocument({ name, rawDocument });
    const doc = result.document || {};
    if (kind === "receipt") {
      const expected = sample.entities || {};
      const actual = { company: entityValue(doc, "supplier_name"), date: entityValue(doc, "receipt_date"), total: entityValue(doc, "total_amount") };
      const sameCompany = (left, right) => { const a = norm(left).split(" ").filter(token => token.length > 1); const b = new Set(norm(right).split(" ").filter(token => token.length > 1)); return a.length > 0 && a.filter(token => b.has(token)).length / a.length >= 0.7; };
      const matches = ["company", "date", "total"].filter(key => {
        if (!expected[key] || !actual[key]) return false;
        if (key === "total") return digits(expected[key]) === digits(actual[key]);
        if (key === "date") return normalizedDate(expected[key]) === normalizedDate(actual[key]);
        return sameCompany(expected[key], actual[key]);
      });
      return { index, ok: true, matched: matches.length, fields: 3, expected: { company: expected.company, date: expected.date, total: expected.total }, actual, text: doc.text || "" };
    }
    const expectedText = norm(reference || ""); const actualText = norm(doc.text || "");
    const expectedWords = expectedText.split(" ").filter(Boolean); const actualWords = actualText.split(" ").filter(Boolean);
    const wordDistance = editDistance(expectedWords, actualWords); const charDistance = editDistance(expectedText, actualText);
    return { index, ok: true, wordErrors: wordDistance, wordCount: expectedWords.length, wordErrorRatePercent: expectedWords.length ? 100 * wordDistance / expectedWords.length : 0, charErrors: charDistance, charCount: expectedText.length, charErrorRatePercent: expectedText.length ? 100 * charDistance / expectedText.length : 0, text: (doc.text || "").slice(0, 250) };
  } catch (error) { return { index, ok: false, error: String(error.message).split("\n")[0] }; }
}

const receiptRows = await rows("jsdnrs/ICDAR2019-SROIE", "test", 10);
const documentRows = await rows("tejasvaidhya/FUNSD", "test", 10);
const receipts = [];
for (let i = 0; i < receiptRows.length; i++) { receipts.push(await scan(process.env.DOCUMENT_AI_RECEIPT_PROCESSOR_ID, receiptRows[i].row, null, "receipt", i + 1)); await sleep(300); }
const documents = [];
for (let i = 0; i < documentRows.length; i++) { documents.push(await scan(process.env.DOCUMENT_AI_OCR_PROCESSOR_ID, documentRows[i].row, documentRows[i].row.ocr_annotation_texts, "document", i + 1)); await sleep(300); }
const receiptMatched = receipts.reduce((sum, item) => sum + (item.matched || 0), 0);
const receiptFields = receipts.reduce((sum, item) => sum + (item.fields || 0), 0);
const docWordErrors = documents.reduce((sum, item) => sum + (item.wordErrors || 0), 0);
const docWords = documents.reduce((sum, item) => sum + (item.wordCount || 0), 0);
const docCharErrors = documents.reduce((sum, item) => sum + (item.charErrors || 0), 0);
const docChars = documents.reduce((sum, item) => sum + (item.charCount || 0), 0);
const report = {
  generatedAt: new Date().toISOString(), project: process.env.GOOGLE_CLOUD_PROJECT, location,
  receipts: { attempted: receipts.length, succeeded: receipts.filter(item => item.ok).length, matchedFields: receiptMatched, totalFields: receiptFields, accuracyPercent: 100 * receiptMatched / Math.max(1, receiptFields), results: receipts },
  documents: { attempted: documents.length, succeeded: documents.filter(item => item.ok).length, wordErrors: docWordErrors, expectedWords: docWords, wordErrorRatePercent: 100 * docWordErrors / Math.max(1, docWords), charErrors: docCharErrors, expectedCharacters: docChars, characterErrorRatePercent: 100 * docCharErrors / Math.max(1, docChars), results: documents },
};
await fs.writeFile("artifacts/google-documentai-test-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ receipts: report.receipts, documents: report.documents, report: "artifacts/google-documentai-test-report.json" }, null, 2));
await client.close();
