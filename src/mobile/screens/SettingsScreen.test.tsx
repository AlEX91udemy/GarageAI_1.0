import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen";
import { GARAGE_CURRENCY_KEY } from "../currency";
import { DISTANCE_UNIT_KEY, VOLUME_UNIT_KEY } from "../units";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
});

const renderSettings = (themeMode: "light" | "dark" = "light") => {
  const onThemeChange = vi.fn();
  const onDarkVariantChange = vi.fn();
  act(() => {
    root.render(
      <SettingsScreen
        onBack={vi.fn()}
        themeMode={themeMode}
        onThemeChange={onThemeChange}
        onDarkVariantChange={onDarkVariantChange}
      />
    );
  });
  return { onThemeChange, onDarkVariantChange };
};

it("renders garage parameters in the light theme", () => {
  renderSettings();

  expect(container.textContent).toContain("Параметры Гаража");
  expect(container.querySelector(".bg-white")).not.toBeNull();
  expect(container.textContent).toContain("Light");
});

it("switches to light theme and persists garage settings", () => {
  const { onThemeChange } = renderSettings("dark");
  const buttons = Array.from(container.querySelectorAll("button"));

  act(() => buttons.find((button) => button.textContent?.trim() === "Light")?.click());
  expect(onThemeChange).toHaveBeenCalledWith("light");

  act(() => buttons.find((button) => button.textContent?.includes("Мили"))?.click());
  act(() => buttons.find((button) => button.textContent?.includes("Галлоны"))?.click());
  act(() => buttons.find((button) => button.textContent?.trim() === "$")?.click());

  expect(localStorage.getItem(DISTANCE_UNIT_KEY)).toBe("mi");
  expect(localStorage.getItem(VOLUME_UNIT_KEY)).toBe("gal");
  expect(localStorage.getItem(GARAGE_CURRENCY_KEY)).toBe("usd");
});

it("activates and reports both additional dark themes", () => {
  for (const [label, variant, titlePart] of [
    ["Carbon Black", "carbon", "Графитовая"],
    ["OLED Midnight", "oled", "Чёрная OLED"],
  ] as const) {
    const { onThemeChange, onDarkVariantChange } = renderSettings("dark");
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === label
    );

    act(() => button?.click());
    expect(onDarkVariantChange).toHaveBeenCalledWith(variant);
    expect(onThemeChange).toHaveBeenCalledWith("dark");
    expect(button?.getAttribute("title")).toContain(titlePart);
  }
});

it("persists notification switches", () => {
  renderSettings();
  const checkboxes = container.querySelectorAll<HTMLInputElement>("input[type=checkbox]");

  act(() => {
    checkboxes[0].click();
    checkboxes[1].click();
  });

  expect(localStorage.getItem("garagehub_notify_service")).toBe("false");
  expect(localStorage.getItem("garagehub_notify_ai")).toBe("false");
});
