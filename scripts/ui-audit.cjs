// Run with PLAYWRIGHT_PATH pointing to the existing Playwright installation.
// This audit never submits business data; browser profile is temporary.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const fs = require("node:fs");
const path = require("node:path");
const BASE_URL = process.env.UI_AUDIT_URL || "http://localhost:3000/app";
const out = path.resolve("artifacts/ui-audit");
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  // Use a fresh deterministic browser state. A previously registered SW can
  // serve stale bundles and prevent the current app shell from mounting.
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  const results = [];
  page.on("pageerror", e => errors.push(e.message));
  const auditGarage = {
    vehicles: [{
      id: "audit-lada-vesta", make: "LADA", model: "Vesta", generation: "NG",
      year: 2022, engine: "1.6 бензин", fuelType: "АИ-95", transmission: "МКПП",
      driveType: "Передний", currentMileage: 48200, lastMileageUpdate: "2026-11-14",
      colorHex: "#b91c1c", model3dUrl: "/models/lada-vesta.glb"
    }],
    reminders: [], serviceRecords: [], fuelRecords: [], oemSchedules: [],
    garageParts: [], toFixTasks: [], tuningStages: [], lastUpdated: new Date().toISOString()
  };
  // Guard against accidental writes, AI requests, or external data transmission.
  await context.route("**/api/**", route => {
    if (route.request().method() !== "GET") return route.abort();
    if (new URL(route.request().url()).pathname === "/api/data") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(auditGarage) });
    }
    return route.continue();
  });
  // External font providers may keep the `load` event pending in restricted
  // environments. The app is usable once the DOM and its own bundles load,
  // so anchor navigation to DOMContentLoaded and wait for the app heading.
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.getByRole("heading", { name: "Главное по машине" }).waitFor();
  const setTheme = async (theme) => {
    const segmented = page.locator(`#theme-toggle-${theme}`);
    if (await segmented.count()) {
      await segmented.click();
      return;
    }
    // The current WebApp exposes one icon button and a settings section
    // with the two theme choices behind it.
    const toggle = page.getByRole("button", { name: "Переключить тему" });
    if (!(await toggle.count())) throw new Error("Theme controls are missing");
    const isDark = theme === "dark";
    const currentlyDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    if (currentlyDark !== isDark) await toggle.click();
    await page.waitForFunction(dark => document.documentElement.classList.contains("dark") === dark, isDark);
  };
  const before3d = await page.evaluate(() => performance.getEntriesByType("resource").some(r => /Car3DViewer|three\.module/.test(r.name)));
  if (before3d) throw new Error("3D was loaded before activation");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await setTheme(theme);
      await page.screenshot({ path: path.join(out, `dashboard-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
      await page.screenshot({ path: path.join(out, `viewport-${width}-${theme}.png`), animations: "disabled" });
      const dims = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      results.push({ screen: "dashboard", width, theme, overflow: dims.scroll > dims.client });
      if (dims.scroll > dims.client) throw new Error(`Overflow: ${width} ${theme}`);
    }
  }
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await setTheme(theme);
      for (const name of ["История обслуживания", "Регламент ТО", "Расходы на авто", "Склад", "Тюнинг"]) {
        const control = page.getByRole("button", { name: new RegExp(name) }).first();
        if (!(await control.count())) continue;
        await control.click();
        await page.screenshot({ path: path.join(out, `section-${name.replace(/\s+/g, "-")}-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        results.push({ screen: name, width, theme, overflow, headings: await page.locator("main h2, main h1").allTextContents() });
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const historyControl = (await page.getByRole("button", { name: /История обслуживания/ }).count())
    ? page.getByRole("button", { name: /История обслуживания/ }).first()
    : page.getByRole("button", { name: "История", exact: true }).first();
  if (!(await historyControl.count())) throw new Error("History control is missing");
  await historyControl.click();
  await page.getByRole("textbox").fill("нет-такой-записи");
  await page.getByRole("heading", { name: "Записей не найдено" }).waitFor();
  const addRecordButton = page.getByRole("button", { name: "Добавить запись", exact: true });
  await addRecordButton.focus();
  await addRecordButton.click();
  const dialog = page.locator('[role="dialog"]').filter({ hasText: "Новая запись ремонта / ТО" }).first();
  await dialog.waitFor();
  const first = dialog.locator("button").first();
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  if (!(await page.getByRole("button", { name: "Сохранить запись", exact: true }).evaluate(el => el === document.activeElement))) throw new Error("Reverse focus trap failed");
  await page.keyboard.press("Tab");
  if (!(await first.evaluate(el => el === document.activeElement))) throw new Error("Forward focus trap failed");
  await page.getByLabel("Дата обслуживания", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(out, "service-dialog.png") });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForTimeout(200);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const focusState = await page.evaluate(() => {
    const active = document.activeElement;
    return {
      passed: Boolean(active && active !== document.body && active !== document.documentElement &&
        (active instanceof HTMLElement) && active.getClientRects().length > 0),
      tag: active?.tagName || null,
      text: active instanceof HTMLElement ? active.innerText.slice(0, 80) : null,
      ariaLabel: active instanceof HTMLElement ? active.getAttribute("aria-label") : null,
    };
  });
  results.push({ keyboard: "Tab / Shift+Tab / Escape / focus restore", ...focusState });
  await page.getByRole("button", { name: "Профиль", exact: true }).first().click();
  await page.getByRole("heading", { name: "Профиль владельца" }).waitFor();
  const utilityButtons = [
    { name: "AI-диагностика", locator: page.locator("button").filter({ hasText: "Garage AI: диагностика" }) },
    { name: "Сканер чеков", locator: page.getByTitle("Сканер") },
    { name: "Сервисная книжка", locator: page.locator("button").filter({ hasText: "Электронная сервисная книжка" }) },
    { name: "БД", locator: page.locator("button").filter({ hasText: "Резервная копия и синхронизация" }) },
  ];
  for (const { name, locator } of utilityButtons) {
    if (!(await locator.count())) {
      results.push({ modal: name, openClose: false, skipped: "control unavailable in current shell" });
      continue;
    }
    await locator.first().click();
    await page.getByRole("dialog").waitFor();
    await page.screenshot({ path: path.join(out, `modal-${name}.png`), animations: "disabled" });
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    results.push({ modal: name, openClose: true });
  }
  await page.getByRole("button", { name: "Главная", exact: true }).first().click();
  const vehicleIdentity = page.getByText(/LADA\s+Vesta/i).first();
  await vehicleIdentity.waitFor();
  results.push({ vehicleLoaded: true, vehicleText: (await vehicleIdentity.innerText()).slice(0, 80) });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(out, "vehicle-mobile.png"), fullPage: true });
  await context.setOffline(true);
  await page.getByRole("status").filter({ hasText: "Нет подключения" }).waitFor();
  await page.screenshot({ path: path.join(out, "offline.png") });
  await context.setOffline(false);
  results.push({ offline: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const mobileLauncher = (await page.getByRole("button", { name: "Мобильное приложение", exact: true }).count())
    ? page.getByRole("button", { name: "Мобильное приложение", exact: true })
    : page.getByRole("button", { name: "Открыть мобильную версию", exact: true });
  await mobileLauncher.click();
  const mobileShell = page.getByRole("button", { name: "Мои автомобили", exact: true });
  if (!(await mobileShell.count())) {
    await page.getByRole("button", { name: "Главная", exact: true }).last().waitFor();
  } else {
    await mobileShell.waitFor();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(out, "mobile-app-dark.png"), animations: "disabled" });
  await page.locator("#tab-btn-profile").click();
  await page.getByRole("heading", { name: "Профиль владельца" }).waitFor();
  const settingsButton = page.getByRole("button").filter({ has: page.locator("svg") }).first();
  if (await settingsButton.count()) await settingsButton.click();
  const mobileThemeLight = page.getByRole("button", { name: "Light", exact: true });
  if (await mobileThemeLight.count()) {
    await mobileThemeLight.click();
    await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
    results.push({ mobileTheme: true });
  } else {
    results.push({ mobileTheme: false, skipped: "mobile settings unavailable" });
  }
  await page.screenshot({ path: path.join(out, "mobile-app-light.png"), animations: "disabled" });
  const homeTab = page.locator("#tab-btn-home");
  if (await homeTab.count() && await homeTab.first().isVisible()) await homeTab.first().click();
  else {
    const visibleHome = page.getByRole("button", { name: "Главная", exact: true });
    if (await visibleHome.count() && await visibleHome.last().isVisible()) await visibleHome.last().click();
  }
  const addRecord = page.locator("#tab-btn-quick-action");
  if (await addRecord.count()) {
    await addRecord.click();
    const quickActionSheet = page.getByRole("dialog", { name: "Быстрое действие" });
    await quickActionSheet.waitFor();
    await page.waitForFunction(() =>
      document.activeElement?.getAttribute("aria-label") === "Закрыть меню быстрых действий" &&
      document.activeElement.tabIndex >= 0
    );
    await page.keyboard.press("Tab");
    if (!(await quickActionSheet.getByRole("button", { name: /Обслуживание/ }).evaluate(el => el === document.activeElement))) {
      throw new Error("Quick action sheet focus did not skip the backdrop");
    }
    await page.keyboard.press("Escape");
    await quickActionSheet.waitFor({ state: "hidden" });
    results.push({ mobileApp: "390px, обе темы", quickActionSheetKeyboard: true });
  } else {
    results.push({ mobileApp: "390px, обе темы", quickActionSheetKeyboard: false, skipped: "empty mobile shell has no quick-action trigger" });
  }
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
  if (errors.length) throw new Error(`${errors.length} browser errors; see results.json`);
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
