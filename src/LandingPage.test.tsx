import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LandingPage } from "./LandingPage";

describe("LandingPage UI & UX Audit Suite", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders header with uploaded GarageAI logo, navigation, theme toggle, and primary CTA", () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const header = container.querySelector("header");
    expect(header).not.toBeNull();

    const logoImg = header?.querySelector("a img") as HTMLImageElement | null;
    expect(logoImg).not.toBeNull();
    expect(logoImg?.getAttribute("src")).toBe("/garage-ai-mark.png");

    const navLinks = header?.querySelectorAll("nav a");
    expect(navLinks?.length).toBe(4);

    const appButton = header?.querySelector('a[href="/app"]');
    expect(appButton?.textContent).toContain("Открыть веб-приложение");
  });

  it("defaults to light theme and toggles between light and dark themes cleanly", () => {
    act(() => {
      root.render(<LandingPage />);
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    const themeBtn = container.querySelector(
      'header button[aria-label*="тему"]'
    ) as HTMLButtonElement | null;
    expect(themeBtn).not.toBeNull();

    act(() => {
      themeBtn?.click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("garagehub_theme")).toBe("dark");
  });

  it("switches OCR scanner presets between Заказ-наряд СТО and Чек АЗС in Hero demo with realistic receipt data", () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const scannerSection = container.querySelector("#ocr-scanner");
    expect(scannerSection).not.toBeNull();
    expect(scannerSection?.textContent).toContain("Fit Service");
    expect(scannerSection?.textContent).toContain("Замена масла ДВС и фильтра");
    expect(scannerSection?.textContent).not.toContain("Замена масла ДВС + работа");
    expect(scannerSection?.textContent).toContain("14 900 ₽");

    const fuelTab = Array.from(scannerSection?.querySelectorAll("button") || []).find(
      (btn) => btn.textContent?.trim() === "Чек АЗС"
    );
    expect(fuelTab).not.toBeUndefined();

    act(() => {
      fuelTab?.click();
    });

    expect(scannerSection?.textContent).toContain("АЗС Лукойл № 412");
    expect(scannerSection?.textContent).toContain("2 650 ₽");
    expect(scannerSection?.textContent).not.toContain("Статус бака: Полный бак");
    expect(scannerSection?.textContent).not.toContain("Расчётный расход топлива");
  });

  it("eliminates duplicate Hero CTA buttons and OCR modal while keeping header and bottom CTAs to /app", () => {
    act(() => {
      root.render(<LandingPage />);
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).toContain(
      "Сфотографируйте заказ-наряд СТО или чек АЗС"
    );
    expect(container.textContent).toContain(
      "Ведите историю своего автомобиля в GarageAI"
    );
    const heroSection = container.querySelector("main > section:first-of-type");
    expect(heroSection?.querySelectorAll("a").length).toBe(0);
  });

  it("applies unified animation classes (.garage-card-anim, .garage-btn-anim) and unified 5-card footers", () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const workspaceArticles = container.querySelectorAll("#workspace article.garage-card-anim");
    expect(workspaceArticles.length).toBe(5);
    expect(container.textContent).toContain("Сводка по авто");
    expect(container.textContent).not.toContain("Dashboard");
    expect(container.textContent).not.toContain("Статус систем: ОК");
    expect(container.textContent).toContain("Полная история обслуживания");
    expect(container.textContent).toContain("ТО, ОСАГО и сезонные работы");

    const howItWorksSteps = container.querySelectorAll("#how-it-works .garage-card-anim");
    expect(howItWorksSteps.length).toBe(3);

    // Ensure Hero CTA cluster has no redundant #workspace button duplicating the top nav
    const heroSection = container.querySelector("main > section:first-of-type");
    const duplicateWorkspaceAnchor = heroSection?.querySelector('a[href="#workspace"]');
    expect(duplicateWorkspaceAnchor).toBeNull();
  });
});

