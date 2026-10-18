import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useModalFocus } from "./useModalFocus";
import { ConnectionNotice } from "./ConnectionNotice";
import { VehicleStage } from "./VehicleStage";
import { Vehicle } from "../types";
import { getMobileVehicleVisual } from "../mobile/vehicleVisuals";
import { CATALOG_VEHICLE_VISUALS } from "../mobile/catalogVehicleVisuals";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{ width: 44, height: 44 }] as any);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.style.overflow = "";
  vi.restoreAllMocks();
});

function Dialog({ close, open = true }: { close: () => void; open?: boolean }) {
  const ref = useModalFocus(close, open);
  return open ? <div ref={ref} role="dialog" tabIndex={-1}><button tabIndex={-1}>Backdrop</button><button>Первый</button><button disabled>Недоступный</button><button>Последний</button></div> : null;
}

describe("Modal keyboard contract", () => {
  it("traps focus, ignores disabled controls and restores trigger and background", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const close = vi.fn();
    act(() => root.render(<Dialog close={close} />));
    const buttons = container.querySelectorAll("button");
    expect(document.activeElement).toBe(buttons[1]);
    expect(trigger.inert).toBe(true);
    act(() => buttons[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(buttons[3]);
    act(() => buttons[3].dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(buttons[1]);
    act(() => buttons[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(close).toHaveBeenCalledOnce();
    act(() => root.render(null));
    expect(document.activeElement).toBe(trigger);
    expect(trigger.inert).toBe(false);
    expect(document.body.style.overflow).toBe("");
    trigger.remove();
  });
  it("can open after initial closed render without conditional hooks", () => {
    act(() => root.render(<Dialog close={() => {}} open={false} />));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    act(() => root.render(<Dialog close={() => {}} />));
    expect(document.activeElement?.textContent).toBe("Первый");
  });
});

it("announces offline and clears notice after reconnect", () => {
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  act(() => root.render(<ConnectionNotice />));
  expect(container.textContent).toBe("");
  online.mockReturnValue(false);
  act(() => window.dispatchEvent(new Event("offline")));
  expect(container.querySelector('[role="status"]')?.textContent).toContain("Нет подключения");
  online.mockReturnValue(true);
  act(() => window.dispatchEvent(new Event("online")));
  expect(container.textContent).toBe("");
});

it("uses the built-in body template instead of uploaded photos", () => {
  const vehicle = { id: "test", make: "Test", model: "Car", photoUrl: "/missing.jpg" } as Vehicle;
  act(() => root.render(<VehicleStage vehicle={vehicle} />));
  expect(container.querySelector("canvas")).toBeNull();
  expect(container.querySelector("image")?.getAttribute("href")).toBe("/images/body-types/red/suv.png");
});

it("maps every model to its body template", () => {
  const nissan = getMobileVehicleVisual({
    id: "nissan",
    make: "Nissan",
    model: "X-Trail",
    generation: "T31 Рестайлинг (2011–2015)",
  } as Vehicle);
  const unknown = getMobileVehicleVisual({
    id: "unknown",
    make: "Nissan",
    model: "Pathfinder",
  } as Vehicle);

  expect(nissan.src).toBe("/images/body-types/red/suv.png");
  expect(nissan.paintMaskSrc).toBeUndefined();
  expect(unknown.src).toBe("/images/body-types/red/suv.png");
});

it("has an image record for every model in the dropdown catalog", async () => {
  const { CAR_CATALOG, RUSSIA_TOP_100_MODELS, findMake, findModel } = await import("../carCatalog");
  const totalCatalogModels = CAR_CATALOG.flatMap((m) => m.models).length;
  expect(CATALOG_VEHICLE_VISUALS).toHaveLength(totalCatalogModels);
  expect(CATALOG_VEHICLE_VISUALS.every((visual) => visual.src)).toBe(true);
  expect(CAR_CATALOG.length).toBeGreaterThanOrEqual(50);
  expect(RUSSIA_TOP_100_MODELS).toHaveLength(100);
  for (const item of RUSSIA_TOP_100_MODELS) {
    expect(findMake(item.make)).toBeDefined();
    expect(findModel(item.make, item.model)).toBeDefined();
    expect(["new_sales", "used_market", "fleet_share"]).toContain(item.popularityType);
    expect(item.source.length).toBeGreaterThan(0);
    expect(item.period.length).toBeGreaterThan(0);
  }
});

it("resolves Toyota Corolla and Toyota Corolla Cross to distinct catalog models and generations", async () => {
  const { findModel, findGeneration } = await import("../carCatalog");
  const corolla = findModel("Toyota", "Corolla");
  const corollaCross = findModel("Toyota", "Corolla Cross");

  expect(corolla?.name).toBe("Corolla");
  expect(corollaCross?.name).toBe("Corolla Cross");
  expect(corolla?.generations.some((g) => g.name.includes("XG10"))).toBe(false);
  expect(corollaCross?.generations.some((g) => g.name.includes("XG10"))).toBe(true);
  expect(findGeneration("Toyota", "Corolla", "E210")?.bodyTypes.map((b) => b.type)).toEqual([
    "sedan",
    "hatchback",
    "wagon",
  ]);
});

it("assigns accurate body types to BMW 3 Series, Lada Vesta, Skoda Octavia, and Audi A4 generations", async () => {
  const { findGeneration } = await import("../carCatalog");
  // BMW 3 Series G20/G21 has sedan + wagon (no 4-Series coupe)
  expect(findGeneration("BMW", "3 Series", "G20")?.bodyTypes.map((b) => b.type)).toEqual(["sedan", "wagon"]);
  // BMW 3 Series F30 LCI has sedan + wagon + liftback/coupe (F34 GT)
  expect(findGeneration("BMW", "3 Series", "F30 LCI Рестайлинг")?.bodyTypes.map((b) => b.type)).toEqual([
    "sedan",
    "wagon",
    "coupe",
  ]);
  // Lada Vesta has sedan + wagon (no suv or hatchback)
  expect(findGeneration("Lada", "Vesta", "NG Новое поколение")?.bodyTypes.map((b) => b.type)).toEqual([
    "sedan",
    "wagon",
  ]);
  // Skoda Octavia has liftback (coupe) + wagon Combi (no hatchback)
  expect(findGeneration("Skoda", "Octavia", "A8 NX")?.bodyTypes.map((b) => b.type)).toEqual([
    "coupe",
    "wagon",
  ]);
  // Audi A4 B9 has sedan + wagon Avant (no hatchback)
  expect(findGeneration("Audi", "A4", "B9")?.bodyTypes.map((b) => b.type)).toEqual([
    "sedan",
    "wagon",
  ]);
});

