import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MobileApp } from "./MobileApp";

vi.mock("./screens/HomeScreen", () => ({
  HomeScreen: ({ onNavigate }: { onNavigate?: (screen: string) => void }) => (
    <>
      <h1>Главный экран</h1>
      <button type="button" id="test-open-vehicle" onClick={() => onNavigate?.("vehicle_profile")}>Открыть авто</button>
      <button type="button" id="test-open-projects" onClick={() => onNavigate?.("projects")}>Открыть проекты</button>
    </>
  ),
}));
vi.mock("./screens/VehicleProfileScreen", () => ({
  VehicleProfileScreen: ({ onUpdateColor }: { onUpdateColor?: (color: string) => void }) => (
    <>
      <h1>Экран автомобиля</h1>
      <button type="button" id="test-update-color" onClick={() => onUpdateColor?.("#166534")}>
        Изменить цвет
      </button>
    </>
  ),
}));
vi.mock("./screens/ServiceScreen", () => ({
  ServiceScreen: () => <h1>История экрана</h1>,
}));

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
});

it("places History second and Expenses fourth in the bottom navigation", () => {
  const props: React.ComponentProps<typeof MobileApp> = {
    vehicles: [],
    currentVehicle: {
      id: "test",
      make: "Test",
      model: "Car",
      year: 2020,
      engine: "2.0",
      transmission: "AT",
      currentMileage: 1000,
      lastMileageUpdate: "2026-09-11",
    },
    serviceRecords: [],
    fuelRecords: [],
    oemSchedules: [],
    toFixTasks: [],
    garageParts: [],
    tuningStages: [],
    onCreateTuningStage: vi.fn(),
    onUpdateTuningStage: vi.fn(),
    onDeleteTuningStage: vi.fn(),
    onSelectVehicle: vi.fn(),
    onAddServiceRecord: vi.fn(),
    onDeleteServiceRecord: vi.fn(),
    onAddFuelRecord: vi.fn(),
    onAddGaragePart: vi.fn(),
    onDeleteGaragePart: vi.fn(),
    onUpdateGaragePart: vi.fn(),
    onAddToFixTask: vi.fn(),
    onToggleToFixStatus: vi.fn(),
    onUpdateMileage: vi.fn(),
    onOpenAddVehicleModal: vi.fn(),
    onOpenDataBackupModal: vi.fn(),
  };
  act(() => root.render(<MobileApp {...props} />));
  act(() => container.querySelector<HTMLButtonElement>("#tab-btn-history")!.click());
  expect(container.querySelector("h1")?.textContent).toBe("История экрана");
  expect(Array.from(container.querySelectorAll("button[id^='tab-btn-']")).map((button) => button.id)).toEqual([
    "tab-btn-home",
    "tab-btn-history",
    "tab-btn-quick-action",
    "tab-btn-expenses",
    "tab-btn-profile",
  ]);
  for (const tab of ["home", "history", "quick-action", "expenses", "profile"]) {
    expect(container.querySelector(`#tab-btn-${tab}`)).not.toBeNull();
  }
  act(() => container.querySelector<HTMLButtonElement>("#tab-btn-home")!.click());
  expect(container.querySelector("h1")?.textContent).toBe("Главный экран");
});

it("passes vehicle id and color separately from the mobile profile", () => {
  const updateColor = vi.fn();
  const props = {
    vehicles: [],
    currentVehicle: {
      id: "car-42",
      make: "Lada",
      model: "Vesta",
      year: 2024,
      engine: "1.6",
      transmission: "MT",
      currentMileage: 1000,
      lastMileageUpdate: "2026-09-11",
    },
    serviceRecords: [],
    fuelRecords: [],
    oemSchedules: [],
    toFixTasks: [],
    garageParts: [],
    tuningStages: [],
    onCreateTuningStage: vi.fn(),
    onUpdateTuningStage: vi.fn(),
    onDeleteTuningStage: vi.fn(),
    onSelectVehicle: vi.fn(),
    onAddServiceRecord: vi.fn(),
    onDeleteServiceRecord: vi.fn(),
    onAddFuelRecord: vi.fn(),
    onAddGaragePart: vi.fn(),
    onDeleteGaragePart: vi.fn(),
    onUpdateGaragePart: vi.fn(),
    onAddToFixTask: vi.fn(),
    onToggleToFixStatus: vi.fn(),
    onUpdateMileage: vi.fn(),
    onOpenAddVehicleModal: vi.fn(),
    onOpenDataBackupModal: vi.fn(),
    onUpdateVehicleColor: updateColor,
  } satisfies React.ComponentProps<typeof MobileApp>;

  act(() => root.render(<MobileApp {...props} />));
  act(() => container.querySelector<HTMLButtonElement>("#test-open-vehicle")!.click());
  act(() => container.querySelector<HTMLButtonElement>("#test-update-color")!.click());
  expect(updateColor).toHaveBeenCalledWith("car-42", "#166534");
});

it("shows the selected car's saved tuning stages on the mobile detail screen", () => {
  const onCreateTuningStage = vi.fn();
  const onUpdateTuningStage = vi.fn();
  const onDeleteTuningStage = vi.fn();
  const props: React.ComponentProps<typeof MobileApp> = {
    vehicles: [],
    currentVehicle: {
      id: "car-42", make: "Lada", model: "Vesta", year: 2024, engine: "1.6",
      transmission: "MT", currentMileage: 1000, lastMileageUpdate: "2026-09-11",
    },
    serviceRecords: [], fuelRecords: [], oemSchedules: [], toFixTasks: [], garageParts: [],
    tuningStages: [{
      id: "stage-42", vehicleId: "car-42", stageName: "Подвеска", title: "Койловеры",
      description: "Подбор по VIN", status: "planned", estimatedBudget: 42000, actualCost: 0, parts: [],
    }],
    onCreateTuningStage, onUpdateTuningStage, onDeleteTuningStage,
    onSelectVehicle: vi.fn(), onAddServiceRecord: vi.fn(), onDeleteServiceRecord: vi.fn(),
    onAddFuelRecord: vi.fn(), onAddGaragePart: vi.fn(), onDeleteGaragePart: vi.fn(),
    onUpdateGaragePart: vi.fn(), onAddToFixTask: vi.fn(), onToggleToFixStatus: vi.fn(),
    onUpdateMileage: vi.fn(), onOpenAddVehicleModal: vi.fn(), onOpenDataBackupModal: vi.fn(),
  };

  act(() => root.render(<MobileApp {...props} />));
  act(() => container.querySelector<HTMLButtonElement>("#test-open-projects")!.click());
  expect(container.textContent).toContain("0/1 этапов");
  expect(container.textContent).not.toContain("Экспедиционная");
  act(() => Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Доработки"))!.click());
  expect(container.textContent).toContain("Койловеры");
  expect(container.textContent).toContain("Подбор по VIN");
  expect(container.textContent).toContain("42");
  expect(onUpdateTuningStage).not.toHaveBeenCalled();
  expect(onCreateTuningStage).not.toHaveBeenCalled();
  expect(onDeleteTuningStage).not.toHaveBeenCalled();
  act(() => Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Начать")!.click());
  expect(onUpdateTuningStage).toHaveBeenCalledWith(expect.objectContaining({ id: "stage-42", vehicleId: "car-42", status: "in_progress" }));
  act(() => root.render(<MobileApp {...props} currentVehicle={{ ...props.currentVehicle, id: "other-car" }} />));
  expect(container.textContent).not.toContain("Койловеры");
  expect(container.textContent).toContain("В проекте пока нет этапов");
});
