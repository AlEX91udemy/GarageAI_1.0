import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddEventScreen } from "./AddEventScreen";
import type { Vehicle } from "../../types";

vi.mock("./BarcodeScannerScreen", () => ({
  BarcodeScannerScreen: () => <div>Barcode scanner</div>,
}));

const vehicle = {
  id: "test-car",
  make: "Test",
  model: "Car",
  year: 2024,
  engine: "2.0",
  transmission: "AT",
  currentMileage: 12000,
  lastMileageUpdate: "2026-10-01",
} satisfies Vehicle;

let container: HTMLDivElement;
let root: Root;

function renderScreen(initialType: "service" | "repair" | "part" | "fuel", handlers = {}, vehicleOverride?: Partial<Vehicle>) {
  const props = {
    vehicle: { ...vehicle, ...vehicleOverride },
    initialType,
    onBack: vi.fn(),
    onSaveService: vi.fn(),
    onSaveFuel: vi.fn(),
    onSaveProblem: vi.fn(),
    onSavePart: vi.fn(),
    ...handlers,
  };
  act(() => root.render(<AddEventScreen {...props} />));
  return props;
}

function inputByLabel(label: string): HTMLInputElement {
  const labelNode = Array.from(container.querySelectorAll("label")).find((node) => node.textContent?.includes(label));
  const input = labelNode?.parentElement?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error(`Missing input: ${label}`);
  return input;
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function selectByLabel(label: string): HTMLSelectElement {
  const select = container.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`);
  if (!select) throw new Error(`Missing select: ${label}`);
  return select;
}

function setSelect(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  act(() => {
    setter?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

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
});

describe("AddEventScreen", () => {
  it("does not show a redundant service or repair type selector", () => {
    renderScreen("service");

    expect(container.querySelector("[aria-label='Тип события']")).toBeNull();
    expect(container.textContent).not.toContain("Установленные запчасти");
  });

  it("routes the repair shortcut into the same service form", () => {
    renderScreen("repair");

    expect(container.textContent).toContain("Добавить услугу (ТО)");
    expect(container.textContent).toContain("Название события / Работы");
    expect(container.querySelector("[aria-label='Тип события']")).toBeNull();
  });

  it("keeps the purchase currency label and symbol in sync with the selected setting", () => {
    localStorage.setItem("garagehub_currency", "usd");
    renderScreen("part");

    expect(container.textContent).toContain("Цена покупки ($)");
    expect(container.querySelector<HTMLInputElement>("input[type='number']")?.previousElementSibling?.textContent).toBe("$");
    expect(container.textContent).not.toContain("Цена покупки (₽)");
  });

  it("saves the selected fuel type, amount, and custom station", () => {
    const { onSaveFuel } = renderScreen("fuel");
    act(() => Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.trim() === "Цена за литр")?.click());
    setInput(container.querySelector<HTMLInputElement>("input[aria-label='Объем заправки в литрах']")!, "42.5");
    setSelect(container.querySelector<HTMLSelectElement>("select")!, "Другое");
    const stationInput = container.querySelector<HTMLInputElement>("input[placeholder='Название АЗС']");
    if (!stationInput) throw new Error("Missing custom station field");
    setInput(stationInput, "АЗС Тест");
    act(() => container.querySelector<HTMLButtonElement>("button.bg-red-600")?.click());
    act(() => Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.trim() === "Сохранить")?.click());

    expect(onSaveFuel).toHaveBeenCalledWith(expect.objectContaining({
      liters: 42.5,
      fuelType: "АИ-95",
      station: "АЗС Тест",
    }));
  });

  it("limits fuel choices for gasoline and calculates total from price per liter", () => {
    const { onSaveFuel } = renderScreen("fuel", {}, { fuelType: "Бензин (АИ-95)" });
    expect(container.querySelector("select[aria-label='Тип топлива']")).toBeNull();
    expect(container.textContent).not.toContain("ДТ");

    act(() => container.querySelector<HTMLButtonElement>("button") &&
      Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent?.trim() === "Цена за литр")?.click());
    setInput(container.querySelector<HTMLInputElement>("input[placeholder='0.00']")!, "62.5");
    setInput(container.querySelector<HTMLInputElement>("input[aria-label='Объем заправки в литрах']")!, "40");
    act(() => Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.trim() === "Сохранить")?.click());

    expect(onSaveFuel).toHaveBeenCalledWith(expect.objectContaining({
      fuelType: "АИ-95",
      liters: 40,
      pricePerLiter: 62.5,
      totalCost: 2500,
    }));
  });

  it("suggests catalog parts and fills related part fields", () => {
    const { onSavePart } = renderScreen("part");
    expect(container.textContent).not.toContain("Место хранения в гараже");
    const nameInput = container.querySelector<HTMLInputElement>("input[aria-label='Наименование детали']");
    if (!nameInput) throw new Error("Missing part name input");
    setInput(nameInput, "масляный фильтр");

    const suggestion = Array.from(container.querySelectorAll<HTMLButtonElement>("[role='option']"))
      .find((button) => button.textContent?.includes("W67/1"));
    expect(suggestion).toBeDefined();
    act(() => suggestion?.click());

    expect(nameInput.value).toBe("Масляный фильтр двигателя");
    expect(container.querySelector<HTMLInputElement>("input[aria-label='Производитель / Бренд']")?.value).toBe("Mann-Filter");
    expect(container.querySelector<HTMLInputElement>("input[aria-label='Артикул / SKU']")?.value).toBe("W67/1");
    expect(Array.from(container.querySelectorAll("select")).some((select) => select.value === "ТО и замена жидкостей")).toBe(true);

    act(() => Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.trim() === "Сохранить")?.click());
    expect(onSavePart).toHaveBeenCalledWith(expect.objectContaining({
      name: "Масляный фильтр двигателя",
      brand: "Mann-Filter",
      partNumber: "W67/1",
      purchasePrice: 750,
      category: "ТО и замена жидкостей",
    }));
  });

  it("shows work suggestions while typing and fills the category when one is selected", () => {
    const { onSaveService } = renderScreen("service");
    const titleInput = container.querySelector<HTMLInputElement>("input[role='combobox']");
    if (!titleInput) throw new Error("Missing work title input");
    setInput(titleInput, "колодки");
    act(() => titleInput.focus());

    const suggestion = Array.from(container.querySelectorAll<HTMLButtonElement>("[role='option']"))
      .find((button) => button.textContent?.includes("Замена тормозных колодок"));
    expect(suggestion).toBeDefined();
    act(() => suggestion?.click());
    expect(titleInput.value).toBe("Замена тормозных колодок");
    expect(Array.from(container.querySelectorAll("select")).find((select) => select.value === "Тормозная система")).toBeDefined();

    act(() => Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.trim() === "Сохранить")?.click());
    expect(onSaveService).toHaveBeenCalledWith(expect.objectContaining({
      title: "Замена тормозных колодок",
      category: "Тормозная система",
    }));
    expect(onSaveService.mock.calls[0][0]).not.toHaveProperty("parts");
  });
});
