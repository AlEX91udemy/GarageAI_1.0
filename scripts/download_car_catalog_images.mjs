import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CAR_CATALOG } from "../src/carCatalog.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "images", "mobile-cars", "catalog");
const manifestPath = path.join(outputDir, "manifest.json");
const headers = { "User-Agent": "GarageHub-local-catalog/1.0 (local development)" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, attempts = 6) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500) return response;
    await sleep(Math.min(15000, 1000 * 2 ** attempt));
  }
  return fetch(url, { ...options, headers: { ...headers, ...options.headers } });
}

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9а-яё]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const stopWords = new Set([
  "car", "cars", "automobile", "automobiles", "vehicle", "vehicles",
  "series", "class", "pro", "max", "plus", "restyling", "facelift",
]);

const SEARCH_ALIASES = {
  "Mercedes-Benz:GLE / ML": "Mercedes-Benz GLE",
  "Haval:F7 / F7x": "Haval F7",
  "Geely:Tugella": "Geely Tugella Xingyue",
  "Tank:300": "GWM Tank 300",
  "Tank:500": "GWM Tank 500",
};

const preferredWords = [
  "front", "rear", "side", "profile", "sedan", "suv", "hatchback",
  "coupe", "parked", "view", "facelift",
];

const rejectedWords = [
  "accident", "crash", "crashed", "damaged", "wreck", "police", "taxi",
  "ambulance", "race", "racing", "rally", "art car", "livery", "toy",
  "model car", "interior", "engine", "wheel", "logo", "badge", "brochure",
  "diagram", "drawing", "comparison", "versus", " vs ", "carrier", "transport",
  "advertising", "delivery", "camouflage", "concept", "close-up", "detail",
];

const modelTokens = (model) =>
  normalize(model)
    .split(" ")
    .filter((token) => token.length > 1 && !stopWords.has(token));

const scorePage = (page, make, model) => {
  const title = normalize(page.title || "");
  const makeTokens = normalize(make).split(" ").filter(Boolean);
  const tokens = modelTokens(model);
  let score = 0;
  if (makeTokens.every((token) => title.includes(token))) score += 30;
  if (title.includes(normalize(model))) score += 60;
  score += tokens.filter((token) => title.includes(token)).length * 15;
  score += preferredWords.filter((word) => title.includes(word)).length * 5;
  score -= rejectedWords.filter((word) => title.includes(word)).length * 80;
  const info = page.imageinfo?.[0];
  if (info?.width && info?.height) {
    const ratio = info.width / info.height;
    if (ratio >= 1.25 && ratio <= 2.2) score += 12;
    if (ratio < 0.85 || ratio > 2.8) score -= 30;
  }
  return score;
};

const catalog = CAR_CATALOG.flatMap((makeInfo) =>
  makeInfo.models.map((modelInfo) => ({
    make: makeInfo.name,
    model: modelInfo.name,
    bodyType: modelInfo.defaultBodyType,
  })),
);

await fs.mkdir(outputDir, { recursive: true });

const manifest = [];
for (const entry of catalog) {
  const searchName = SEARCH_ALIASES[`${entry.make}:${entry.model}`] || `${entry.make} ${entry.model}`;
  const query = `intitle:"${searchName}" car`;
  const apiUrl =
    "https://commons.wikimedia.org/w/api.php?action=query&generator=search" +
    `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=24` +
    "&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1280&format=json&origin=*";

  const result = await fetchWithRetry(apiUrl);
  if (!result.ok) throw new Error(`Commons search failed for ${query}: ${result.status}`);
  const json = await result.json();
  const pages = Object.values(json.query?.pages || {});
  const ranked = pages
    .filter((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url)
    .sort((a, b) => scorePage(b, entry.make, entry.model) - scorePage(a, entry.make, entry.model));
  const selected = ranked[0];
  const imageInfo = selected?.imageinfo?.[0];
  const imageUrl = imageInfo?.thumburl || imageInfo?.url;
  const slug = `${entry.make}-${entry.model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const localPath = `/images/mobile-cars/catalog/${slug}.jpg`;

  if (imageUrl) {
    const imageResponse = await fetchWithRetry(imageUrl);
    if (!imageResponse.ok) throw new Error(`Image download failed for ${query}: ${imageResponse.status}`);
    await fs.writeFile(path.join(root, "public", localPath), Buffer.from(await imageResponse.arrayBuffer()));
  }

  manifest.push({
    ...entry,
    slug,
    src: imageUrl ? localPath : "",
    sourceTitle: selected?.title || "",
    sourceUrl: imageInfo?.descriptionurl || imageInfo?.url || "",
    license: imageInfo?.extmetadata?.LicenseShortName?.value || "",
    selectionScore: selected ? scorePage(selected, entry.make, entry.model) : 0,
  });
  console.log(`${manifest.length}/${catalog.length} ${entry.make} ${entry.model}${imageUrl ? "" : " (not found)"}`);
  await sleep(1200);
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
