import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VehicleModal } from "./VehicleModal";
import type { Vehicle } from "../types";

const vehicle: Vehicle = {
  id: "car-1",
  make: "Toyota",
  model: "Corolla",
  year: 2020,
  engine: "2.0L",
  transmission: "АКПП",
  currentMileage: 10000,
  lastMileageUpdate: "14.11.2026",
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function renderModal(overrides: Partial<React.ComponentProps<typeof VehicleModal>> = {}) {
  const props: React.ComponentProps<typeof VehicleModal> = {
    currentVehicle: vehicle,
    allVehicles: [vehicle, { ...vehicle, id: "car-2", model: "Camry" }],
    initialMode: "edit",
    onClose: vi.fn(),
    onSaveVehicle: vi.fn(() => false),
    onAddVehicle: vi.fn(() => false),
    onDeleteVehicle: vi.fn(() => false),
    ...overrides,
  };
  act(() => root.render(<VehicleModal {...props} />));
  return props;
}

describe("VehicleModal confirmation contract", () => {
  it("keeps the edit modal open when saving is declined", () => {
    const props = renderModal();

    act(() => {
      const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Сохранить параметры"));
      button?.click();
    });

    expect(props.onSaveVehicle).toHaveBeenCalledTimes(1);
    expect(props.onClose).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("keeps the edit modal open when deletion is declined", () => {
    const props = renderModal();

    act(() => {
      const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Удалить"));
      button?.click();
    });

    expect(props.onDeleteVehicle).toHaveBeenCalledWith(vehicle.id);
    expect(props.onClose).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
