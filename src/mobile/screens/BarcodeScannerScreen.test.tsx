import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarcodeScannerScreen } from "./BarcodeScannerScreen";
import type { Vehicle } from "../../types";

const vehicle: Vehicle = {
  id: "vehicle-test",
  make: "Nissan",
  model: "X-Trail",
  generation: "T31",
  year: 2008,
  engine: "2.0 MR20DE",
  transmission: "CVT",
  currentMileage: 100000,
  lastMileageUpdate: "2026-11-18",
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline test")));
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockRejectedValue(new Error("camera unavailable")) },
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const renderScanner = async (props: Partial<React.ComponentProps<typeof BarcodeScannerScreen>> = {}) => {
  await act(async () => {
    root.render(
      <BarcodeScannerScreen
        vehicle={vehicle}
        allVehicles={[]}
        garageParts={[]}
        onBack={vi.fn()}
        onApplyResult={vi.fn()}
        {...props}
      />,
    );
  });
};

const clickDemo = async (label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label),
  );
  expect(button).toBeTruthy();
  await act(async () => {
    button!.click();
    await Promise.resolve();
  });
};

describe("barcode scanner result UX", () => {
  it("shows an unknown code as manual verification without invented part or price", async () => {
    await renderScanner();
    await clickDemo("Неизвестный штрихкод");

    expect(container.textContent).toContain("Цена, наличие и совместимость неизвестны");
    expect(container.textContent).toContain("Внести код вручную");
    expect(container.textContent).not.toContain("рыночная цена");
    expect(container.textContent).not.toContain("шт. у поставщиков");
  });

  it("offers to transfer a valid VIN without claiming a garage match", async () => {
    const onApplyVin = vi.fn();
    await renderScanner({ onApplyVin });
    await clickDemo("VIN: Nissan X-Trail T31");

    expect(container.textContent).toContain("VIN проверен по формату");
    expect(container.textContent).toContain("Точную модель и год нужно подтвердить");
    expect(container.textContent).not.toContain("совпадает с текущим автомобилем");
    await act(async () => {
      Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Заполнить VIN"))?.click();
    });
    expect(onApplyVin).toHaveBeenCalledWith("JN1TBNT31U0048123", undefined);
  });

  it("warns when the scanned catalog part has no confirmed fitment for the selected vehicle", async () => {
    await renderScanner({ vehicle: { ...vehicle, generation: "T32" } });
    await clickDemo("Колодки Brembo P 56 062");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.textContent).toContain("Демо-оценка запчасти");
    expect(container.textContent).toContain("Совместимость с Nissan X-Trail не подтверждена каталогом");
    expect(container.textContent).toContain("Проверьте артикул по VIN");
  });
});
