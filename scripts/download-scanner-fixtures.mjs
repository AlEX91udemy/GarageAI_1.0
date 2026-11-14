import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(process.cwd(), "artifacts", "scanner-fixtures");
const hfRows = "https://datasets-server.huggingface.co/first-rows?dataset=CC1984%2Fmall_receipt_extraction_dataset&config=default&split=test";

async function getJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "GarageAI-scanner-fixture-downloader/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function commonsSearch(term, limit = 50) {
  const params = new URLSearchParams({ action: "query", generator: "search", gsrsearch: term, gsrnamespace: "6", gsrlimit: String(limit), prop: "imageinfo", iiprop: "url|thumburl|mime|size|extmetadata", iiurlwidth: "1600", format: "json" });
  const data = await getJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  return Object.values(data.query?.pages || {}).map((page) => {
    const info = page.imageinfo?.[0];
    return info ? { title: page.title, url: info.thumburl || info.url, sourceUrl: info.url, mime: info.mime, metadata: info.extmetadata || {} } : null;
  }).filter(Boolean);
}

async function download(url, output) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "GarageAI-scanner-fixture-downloader/1.0 (research fixture download)" } });
    if (response.ok) {
      const bytes = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(output, bytes);
      return { bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
    }
    lastError = new Error(`${response.status} ${response.statusText}: ${url}`);
    if (![429, 500, 502, 503, 504].includes(response.status)) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
  }
  throw lastError;
}

function safeName(name, fallback) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return (base || fallback).slice(0, 120);
}

async function writeCommonsCategory(category, terms, count, allowedMimes) {
  const all = [];
  for (const term of terms) all.push(...await commonsSearch(term, 50));
  const seen = new Set();
  const candidates = all.filter((item) => {
    if (!allowedMimes.includes(item.mime) || seen.has(item.url)) return false;
    const title = item.title.toLowerCase();
    if (category === "sts" && /(voter|draft registration|election|registration card)/i.test(title) && !/(vehicle|motor|automobile|car)/i.test(title)) return false;
    if (category === "vin" && !/(vin|chassis|identification plate|vehicle identification)/i.test(title)) return false;
    seen.add(item.url);
    return true;
  }).slice(0, count);
  if (candidates.length < count) throw new Error(`${category}: found ${candidates.length}, need ${count}`);
  const directory = path.join(root, category);
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
  const manifest = [];
  let index = 0;
  for (const item of candidates) {
    const extension = item.mime === "application/pdf" ? "pdf" : item.mime.split("/")[1].replace("jpeg", "jpg");
    const filename = `${String(index + 1).padStart(3, "0")}-${safeName(item.title.replace(/^File:/, ""), `source-${index + 1}`)}.${extension}`;
    const file = path.join(directory, filename);
    try {
      const downloadUrl = item.sourceUrl?.startsWith("https://upload.wikimedia.org/")
        ? `https://images.weserv.nl/?url=${encodeURIComponent(item.sourceUrl.replace(/^https?:\/\//, ""))}&w=1600`
        : item.url;
      const downloaded = await download(downloadUrl, file);
      manifest.push({ filename: path.posix.join(category, filename), source: item.sourceUrl || item.url, downloadUrl, title: item.title, mime: item.mime, license: item.metadata.LicenseShortName?.value || item.metadata.License?.value || null, author: item.metadata.Artist?.value || null, ...downloaded });
      index += 1;
      if (index >= count) break;
    } catch (error) {
      await fs.rm(file, { force: true });
      console.warn(`Skipping ${item.title}: ${error.message}`);
    }
  }
  if (manifest.length < count) throw new Error(`${category}: downloaded ${manifest.length}, need ${count}`);
  return manifest;
}

await fs.mkdir(root, { recursive: true });
const receiptsData = await getJson(hfRows);
const receiptRows = (receiptsData.rows || []).slice(0, 50);
if (receiptRows.length < 50) throw new Error(`receipts: found ${receiptRows.length}, need 50`);
await fs.rm(path.join(root, "receipt"), { recursive: true, force: true });
await fs.mkdir(path.join(root, "receipt"), { recursive: true });
const receipts = [];
for (let index = 0; index < receiptRows.length; index += 1) {
  const row = receiptRows[index].row;
  const filename = `receipt-${String(index + 1).padStart(3, "0")}.png`;
  const file = path.join(root, "receipt", filename);
  const downloaded = await download(row.image.src, file);
  receipts.push({ filename: path.posix.join("receipt", filename), source: row.image.src, dataset: "CC1984/mall_receipt_extraction_dataset", license: "MIT", groundTruth: row.ground_truth, ...downloaded });
}

const sts = await writeCommonsCategory("sts", ["vehicle registration certificate", "motor vehicle register certificate", "vehicle registration card", "automobile registration certificate", "PTS automobile registration certificate", "vehicle registration document", "car registration document", "registration certificate vehicle"], 50, ["image/jpeg", "image/png"]);
const vin = await writeCommonsCategory("vin", ["VIN plate", "vehicle identification number", "chassis number", "VIN number", "vehicle identification plate"], 50, ["image/jpeg", "image/png"]);
const service = await writeCommonsCategory("service", ["automobile repair manual", "automotive wiring manual", "battery service manual", "vehicle service manual", "vehicle maintenance manual", "automobile laboratory manual"], 50, ["application/pdf", "image/jpeg", "image/png"]);

const manifest = { generatedAt: new Date().toISOString(), sourceBacked: true, warning: "Files are downloaded from public sources. STS and VIN categories are public vehicle documents/images from Wikimedia Commons, not necessarily Russian documents; service category contains public automotive service/maintenance documents and manuals. Check each source license before redistribution.", counts: { receipt: receipts.length, sts: sts.length, vin: vin.length, service: service.length }, documents: [...receipts, ...sts, ...vin, ...service] };
await fs.writeFile(path.join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
await fs.writeFile(path.join(root, "README.md"), `# Internet scanner fixtures\n\nDownloaded source files for scanner testing: 50 receipts from the MIT-licensed \`CC1984/mall_receipt_extraction_dataset\`, 50 public vehicle-registration documents/images, 50 public VIN/chassis identification images, and 50 public automotive service/maintenance documents from Wikimedia Commons.\n\nThe STS, VIN, and service folders are source collections rather than claims that every file is a Russian STS, a complete VIN document, or a service invoice. See \`manifest.json\` for the original URL, title, MIME type, author, and license metadata for every file.\n`, "utf8");
console.log(JSON.stringify({ root, counts: manifest.counts }));
