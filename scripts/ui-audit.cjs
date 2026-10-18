// Run with PLAYWRIGHT_PATH pointing to the existing Playwright installation.
// This audit never submits business data; browser profile is temporary.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const fs = require("node:fs");
const path = require("node:path");
const out = path.resolve("artifacts/ui-audit");
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  const results = [];
  page.on("pageerror", e => errors.push(e.message));
  // Guard against accidental writes, AI requests, or external data transmission.
  await context.route("**/api/**", route => {
    if (route.request().method() !== "GET") return route.abort();
    return route.continue();
  });
  await page.goto("http://localhost:3000");
  await page.getByRole("heading", { name: "Главное по машине" }).waitFor();
  const before3d = await page.evaluate(() => performance.getEntriesByType("resource").some(r => /Car3DViewer|three\.module/.test(r.name)));
  if (before3d) throw new Error("3D was loaded before activation");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.locator(`#theme-toggle-${theme}`).click();
      await page.waitForFunction(dark => document.documentElement.classList.contains("dark") === dark, theme === "dark");
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
      await page.locator(`#theme-toggle-${theme}`).click();
      await page.waitForFunction(dark => document.documentElement.classList.contains("dark") === dark, theme === "dark");
      for (const name of ["Журнал 6", "Регламент ТО", "Расходы", "Склад", "Тюнинг"]) {
        await page.getByRole("button", { name, exact: true }).first().click();
        await page.screenshot({ path: path.join(out, `section-${name.replace(/\s+/g, "-")}-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        results.push({ screen: name, width, theme, overflow, headings: await page.locator("main h2, main h1").allTextContents() });
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Журнал 6", exact: true }).click();
  await page.getByRole("textbox").fill("нет-такой-записи");
  await page.getByRole("heading", { name: "Записей не найдено" }).waitFor();
  await page.getByRole("button", { name: "Добавить запись", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Запись ремонта и ТО" });
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
  if (!(await page.getByRole("button", { name: "Добавить запись", exact: true }).evaluate(el => el === document.activeElement))) throw new Error("Focus restore failed");
  results.push({ keyboard: "Tab / Shift+Tab / Escape / focus restore", passed: true });
  for (const name of ["AI-диагностика", "Сканер чеков", "Сервисная книжка", "БД"]) {
    await page.getByRole("button", { name, exact: true }).first().click();
    await page.getByRole("dialog").waitFor();
    await page.screenshot({ path: path.join(out, `modal-${name}.png`), animations: "disabled" });
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    results.push({ modal: name, openClose: true });
  }
  await page.getByRole("button", { name: "Главная", exact: true }).first().click();
  await page.getByRole("button", { name: "Открыть 3D-обзор", exact: true }).click();
  await page.locator("canvas").waitFor();
  await page.getByRole("status").filter({ hasText: "Загрузка 3D" }).waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Бок", exact: true }).click();
  await page.screenshot({ path: path.join(out, "3d-desktop.png"), animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(out, "3d-mobile.png"), fullPage: true });
  await context.setOffline(true);
  await page.getByRole("status").filter({ hasText: "Нет подключения" }).waitFor();
  await page.screenshot({ path: path.join(out, "offline.png") });
  await context.setOffline(false);
  results.push({ lazy3d: true, offline: true });
  await page.getByRole("button", { name: "Фото", exact: true }).click();
  await context.route("**/*.glb", route => route.abort());
  await page.getByRole("button", { name: "3D-обзор", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Модель не загрузилась" }).waitFor();
  await page.screenshot({ path: path.join(out, "3d-fallback.png"), animations: "disabled" });
  results.push({ glbNetworkFallback: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Мобильное приложение", exact: true }).click();
  await page.getByRole("button", { name: "Мои автомобили", exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(out, "mobile-app-dark.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Переключить на светлую тему", exact: true }).click();
  await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
  await page.screenshot({ path: path.join(out, "mobile-app-light.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Добавить запись", exact: true }).click();
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
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
  if (errors.length) throw new Error(`${errors.length} browser errors; see results.json`);
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
