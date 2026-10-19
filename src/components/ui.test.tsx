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

it("has an image record for every model in the dropdown catalog", () => {
  expect(CATALOG_VEHICLE_VISUALS).toHaveLength(55);
  expect(CATALOG_VEHICLE_VISUALS.every((visual) => visual.src)).toBe(true);
});
