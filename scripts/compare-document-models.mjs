import fs from "node:fs/promises";
const env = Object.fromEntries((await fs.readFile(new URL("../.env", import.meta.url), "utf8")).split(/\r?\n/).filter(Boolean).map(line => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1)]; }));
const key = env.OPENROUTER_DOCUMENT_API_KEY || env.OPENROUTER_API_KEY;
if (!key || !/^sk-or-v1-[a-f0-9]{64}$/.test(key)) throw new Error("Document OpenRouter key is missing or malformed");
const models = (process.env.BENCH_MODELS || "google/gemini-2.5-pro,qwen/qwen3-vl-235b-a22b-instruct,google/gemini-2.5-flash,dots-studio/dots-3-note-preview:free").split(",").map(model => model.trim()).filter(Boolean);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalize = value => String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
async function getRows() {
  const url = "https://datasets-server.huggingface.co/rows?dataset=tejasvaidhya%2FFUNSD&config=default&split=test&offset=0&length=20";
  const response = await fetch(url); if (!response.ok) throw new Error(`Dataset request failed (${response.status})`); return (await response.json()).rows || [];
}
async function asDataUrl(src) { const response = await fetch(src); if (!response.ok) throw new Error(`Image fetch failed (${response.status})`); const mime = response.headers.get("content-type")?.split(";")[0]; const safeMime = mime?.startsWith("image/") ? mime : "image/jpeg"; return `data:${safeMime};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`; }
function parse(data) { const content = data?.choices?.[0]?.message?.content; if (typeof content !== "string") return null; try { return JSON.parse(content); } catch { const match = content.match(/\{[\s\S]*\}/); try { return match ? JSON.parse(match[0]) : null; } catch { return null; } } }
async function ask(model, image) { for (let attempt = 0; attempt < 3; attempt++) { const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "user", content: [{ type: "text", text: "Transcribe every visible word in reading order. Return JSON only: {\"text\":\"...\"}. Do not summarize, omit or correct text." }, { type: "image_url", image_url: { url: image } }] }], response_format: { type: "json_object" }, temperature: 0, max_tokens: 2400 }) }); const data = await response.json().catch(() => ({})); if (response.status === 429 || response.status >= 500) { await sleep(1500 * (attempt + 1)); continue; } return { status: response.status, data, error: data?.error ? JSON.stringify(data.error) : null }; } return { status: 503, data: {}, error: "retry_exhausted" }; }
const rows = await getRows();
const results = {};
for (const model of models) {
  const modelResults = [];
  for (let i = 0; i < rows.length; i++) {
    try { const expected = normalize(rows[i].row.ocr_annotation_texts).split(" ").filter(word => word.length > 1); const expectedSet = new Set(expected); const response = await ask(model, await asDataUrl(rows[i].row.image.src)); const parsed = parse(response.data); const actualSet = new Set(normalize(parsed?.text).split(" ").filter(word => word.length > 1)); const matched = [...expectedSet].filter(word => actualSet.has(word)).length; modelResults.push({ index: i, status: response.status, parsed: Boolean(parsed), matched, expected: expectedSet.size, cost: Number(response.data?.usage?.cost || 0), error: response.error }); } catch (error) { modelResults.push({ index: i, status: 0, parsed: false, matched: 0, expected: new Set(normalize(rows[i].row.ocr_annotation_texts).split(" ").filter(word => word.length > 1)).size, cost: 0, error: String(error) }); }
    if ((i + 1) % 5 === 0) console.log(`${model}: ${i + 1}/${rows.length}`);
    await sleep(250);
  }
  const matched = modelResults.reduce((sum, item) => sum + item.matched, 0); const expected = modelResults.reduce((sum, item) => sum + item.expected, 0);
  results[model] = { count: modelResults.length, http200: modelResults.filter(item => item.status === 200).length, parsed: modelResults.filter(item => item.parsed).length, matched, expected, wordMatchPercent: 100 * matched / Math.max(1, expected), cost: modelResults.reduce((sum, item) => sum + item.cost, 0), details: modelResults };
}
const report = { generatedAt: new Date().toISOString(), dataset: "FUNSD test subset, same 20 images per model", results };
await fs.writeFile(new URL("../artifacts/document-model-comparison.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ results: Object.fromEntries(Object.entries(results).map(([model, value]) => [model, { count: value.count, http200: value.http200, parsed: value.parsed, wordMatchPercent: value.wordMatchPercent, cost: value.cost }])), report: "artifacts/document-model-comparison.json" }, null, 2));
