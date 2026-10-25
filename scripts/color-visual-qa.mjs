import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = path.join(process.cwd(), "artifacts/color-smoke");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "ru-RU",
  serviceWorkers: "block",
});
const errors = [];
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

const username = `palette_qa_${Date.now()}`;
const password = "palette-qa-password-123";
const register = await context.request.post(`${BASE}/api/auth/register`, {
  data: { username, password },
});
if (!register.ok()) throw new Error(`register failed: ${register.status()} ${await register.text()}`);

const sessionResponse = await context.request.get(`${BASE}/api/auth/session`);
if (!sessionResponse.ok()) throw new Error(`session failed: ${sessionResponse.status()}`);
const { csrfToken } = await sessionResponse.json();
const headers = { "x-csrf-token": csrfToken };

async function post(url, data) {
  const response = await context.request.post(`${BASE}${url}`, { headers, data });
  if (!response.ok()) throw new Error(`${url} failed: ${response.status()} ${await response.text()}`);
  return response.json();
}

const vehicle = await post("/api/vehicles", {
  make: "Toyota",
  model: "Camry",
  generation: "XV70",
  year: 2021,
  licensePlate: "А777АА 66",
  vin: "JTNBF1HK203456789",
  engine: "2.5 Dynamic Force (200 л.с.)",
  fuelType: "Бензин (АИ-95)",
  transmission: "Автомат (8-ст)",
  driveType: "Передний",
  currentMileage: 54000,
  colorHex: "#B91C1C",
  bodyType: "sedan",
});

await post("/api/services", {
  vehicleId: vehicle.id,
  date: "2026-09-12",
  mileage: 52000,
  category: "Двигатель",
  title: "Замена масла и фильтров",
  description: "Плановое ТО перед сезоном",
  laborCost: 1800,
  parts: [
    { id: "qa-p1", name: "Моторное масло 5W-30 (5 л)", brand: "Toyota", partNumber: "08880-10705", quantity: 1, unitPrice: 5200 },
    { id: "qa-p2", name: "Фильтр масляный", brand: "Toyota", partNumber: "04152-31090", quantity: 1, unitPrice: 950 },
  ],
  serviceCenter: "СТО GaragePlus",
  notes: "Регламент выполнен, уровень выставлен.",
});
await post("/api/services", {
  vehicleId: vehicle.id,
  date: "2026-07-03",
  mileage: 48000,
  category: "Тормозная система",
  title: "Замена передних тормозных колодок",
  description: "Колодки и обслуживание суппортов",
  laborCost: 2400,
  parts: [
    { id: "qa-p3", name: "Колодки передние", brand: "Brembo", partNumber: "P83137", quantity: 1, unitPrice: 4300 },
  ],
  serviceCenter: "СТО GaragePlus",
});
await post("/api/services", {
  vehicleId: vehicle.id,
  date: "2026-04-15",
  mileage: 44000,
  category: "Шины и диски",
  title: "Шиномонтаж и балансировка",
  laborCost: 3200,
  parts: [],
  serviceCenter: "Колесо",
});

for (const record of [
  { date: "2026-09-20", mileage: 54000, liters: 42.5, pricePerLiter: 62.4, station: "Лукойл" },
  { date: "2026-09-05", mileage: 53500, liters: 38, pricePerLiter: 61.9, station: "Газпромнефть" },
  { date: "2026-08-20", mileage: 52900, liters: 45, pricePerLiter: 60.8, station: "Лукойл" },
  { date: "2026-08-02", mileage: 52200, liters: 40, pricePerLiter: 59.5, station: "Роснефть" },
]) {
  await post("/api/fuel", {
    vehicleId: vehicle.id,
    ...record,
    fuelType: "АИ-95",
    isFullTank: true,
  });
}

await post("/api/reminders", {
  vehicleId: vehicle.id,
  kind: "osago",
  startDate: "2026-02-12",
  durationMonths: 12,
  price: 8200,
  notes: "Полис ОСАГО",
});
await post("/api/reminders", {
  vehicleId: vehicle.id,
  kind: "tax",
  startDate: "2026-01-10",
  durationMonths: 12,
  price: 5400,
  notes: "Транспортный налог",
});
await post("/api/to-fix", {
  vehicleId: vehicle.id,
  title: "Заменить воздушный фильтр",
  priority: "medium",
  estimatedCost: 1400,
  category: "Двигатель",
  description: "Плановое обслуживание",
});
await post("/api/to-fix", {
  vehicleId: vehicle.id,
  title: "Проверить люфт рулевой рейки",
  priority: "high",
  estimatedCost: 3500,
  category: "Подвеска и рулевое",
});
await post("/api/inventory", {
  vehicleId: vehicle.id,
  name: "Масляный фильтр",
  brand: "Toyota",
  partNumber: "04152-31090",
  quantity: 2,
  purchasePrice: 950,
  location: "Полка A2",
  status: "in_stock",
  category: "Двигатель",
});
await post("/api/inventory", {
  vehicleId: vehicle.id,
  name: "Тормозная жидкость DOT 4",
  brand: "Bosch",
  partNumber: "DOT4-1L",
  quantity: 1,
  purchasePrice: 850,
  location: "Полка B1",
  status: "in_stock",
  category: "Тормозная система",
});
await post("/api/tuning", {
  vehicleId: vehicle.id,
  title: "Шумоизоляция дверей",
  stageName: "Комфорт",
  status: "planned",
  estimatedBudget: 24000,
  actualCost: 0,
  description: "Проклейка дверей и багажника",
});
await post("/api/oem-schedule", {
  vehicleId: vehicle.id,
  items: [
    { title: "Замена масла ДВС", category: "Двигатель", intervalKm: 10000, intervalMonths: 12, lastDoneKm: 52000, lastDoneDate: "2026-09-12" },
    { title: "Замена салонного фильтра", category: "Климат", intervalKm: 20000, intervalMonths: 12, lastDoneKm: 44000, lastDoneDate: "2026-04-15" },
  ],
});

async function setTheme(theme) {
  await page.evaluate((value) => {
    localStorage.setItem("garagehub_theme", value);
    localStorage.setItem("garagehub_theme_default_v2", value);
    localStorage.setItem("garagehub_platform_mode", "web");
  }, theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
}

async function screenshot(name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
}

async function layoutReport(label) {
  return page.evaluate((name) => {
    const root = document.documentElement;
    const offenders = [...document.querySelectorAll("body *")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.right > root.clientWidth + 2 || rect.left < -2);
      })
      .slice(0, 8)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)} [${Math.round(rect.left)}..${Math.round(rect.right)}]`;
      });
    return {
      label: name,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      overflow: root.scrollWidth > root.clientWidth,
      offenders,
    };
  }, label);
}

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await setTheme("dark");

const darkCta = await page.getByRole("button", { name: "Сканировать чек" }).evaluate((element) => {
  const style = getComputedStyle(element);
  return { background: style.backgroundColor, color: style.color };
});
const activeNav = await page.getByRole("button", { name: "Главная" }).first().evaluate((element) => getComputedStyle(element).color);
await screenshot("final-desktop-dark.png");

await page.getByRole("button", { name: "Расходы", exact: true }).first().click();
await page.waitForTimeout(1200);
await screenshot("final-desktop-expenses-dark.png");

const desktopLayouts = [];
for (const width of [1600, 1440, 1280, 1024]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.waitForTimeout(350);
  desktopLayouts.push(await layoutReport(`desktop-expenses-${width}`));
}

await setTheme("light");
await page.setViewportSize({ width: 1440, height: 1000 });
await page.getByRole("button", { name: "Главная", exact: true }).first().click();
await page.waitForTimeout(1000);
await screenshot("final-desktop-light.png");
await page.getByRole("button", { name: "Расходы", exact: true }).first().click();
await page.waitForTimeout(1000);
await screenshot("final-desktop-expenses-light.png");

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/?view=mobile`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3200);
await screenshot("final-mobile-light.png");
const mobileLightLayout = await layoutReport("mobile-light");

await page.evaluate(() => {
  localStorage.setItem("garagehub_theme", "dark");
  localStorage.setItem("garagehub_theme_default_v2", "dark");
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3200);
await screenshot("final-mobile-dark.png");
const mobileDarkLayout = await layoutReport("mobile-dark");

const accentColors = await page.evaluate(() => {
  const targets = ["rgb(139, 92, 246)", "rgb(6, 182, 212)", "rgb(236, 72, 153)"];
  return [...document.querySelectorAll("body *")]
    .filter((element) => {
      const style = getComputedStyle(element);
      return [style.color, style.backgroundColor, style.borderColor].some((value) => targets.includes(value));
    })
    .slice(0, 12)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      className: String(element.className).slice(0, 90),
      color: getComputedStyle(element).color,
      background: getComputedStyle(element).backgroundColor,
    }));
});

console.log(JSON.stringify({
  screenshots: fs.readdirSync(OUT).filter((name) => name.startsWith("final-")),
  darkCta,
  activeNav,
  desktopLayouts,
  mobileLightLayout,
  mobileDarkLayout,
  accentColors,
  errors: [...new Set(errors)],
}, null, 2));

await browser.close();
