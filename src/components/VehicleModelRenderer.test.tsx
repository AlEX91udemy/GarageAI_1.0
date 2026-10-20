import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Vehicle } from "../types";
import { CAR_CATALOG } from "../carCatalog";
import { VehicleModelRenderer, getVehicleModelSpec } from "./VehicleModelRenderer";

const baseVehicle = (make: string, model: string, colorHex: string): Vehicle => ({
  id: `${make}-${model}-${colorHex}`,
  make,
  model,
  year: 2024,
  engine: "test",
  transmission: "test",
  currentMileage: 0,
  lastMileageUpdate: "2026-09-12",
  bodyType: "suv",
  colorHex,
});

describe("VehicleModelRenderer", () => {
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    container?.remove();
    container = undefined;
  });

  it("resolves every catalog model to a model-layer renderer", () => {
    expect(getVehicleModelSpec(baseVehicle("Audi", "Q5", "#dc2626"))).toBeDefined();
    expect(getVehicleModelSpec(baseVehicle("Mercedes-Benz", "E-Class", "#dc2626"))).toBeDefined();
    const addedModel = getVehicleModelSpec(baseVehicle("Nissan", "Pathfinder", "#dc2626"));
    expect(addedModel).toMatchObject({ bodyType: "suv", placeholder: undefined });
  });

  it("covers every model exposed by the dropdown catalog", () => {
    const models = CAR_CATALOG.flatMap((make) => make.models.map((model) => ({ make: make.name, model: model.name })));
    expect(models).toHaveLength(200);
    expect(models.every((item) => getVehicleModelSpec(baseVehicle(item.make, item.model, "#dc2626")))).toBe(true);
  });

  it.each([
    ["#dc2626", "red"],
    ["#1e40af", "blue"],
    ["#166534", "green"],
    ["#171717", "black"],
    ["#f1f5f9", "white"],
  ]) (
    "uses the selected body template color: %s",
    (colorHex, assetColor) => {
      container = document.createElement("div");
      document.body.append(container);
      act(() => createRoot(container!).render(<VehicleModelRenderer vehicle={baseVehicle("Nissan", "X-Trail", colorHex)} />));
      expect(container.querySelector('[data-vehicle-layer="original"]')).not.toBeNull();
      expect(container.querySelector('[data-vehicle-layer="painted-body"]')).toBeNull();
      expect(container.querySelector("[data-visual-src]")?.getAttribute("data-visual-src"))
        .toBe(`/images/body-types/${assetColor}/suv.png`);
    },
  );

  it("uses the SUV template for a known model instead of its catalog photo", () => {
    container = document.createElement("div");
    document.body.append(container);
    act(() => createRoot(container!).render(<VehicleModelRenderer vehicle={baseVehicle("Toyota", "RAV4", "#dc2626")} />));
    expect(container.querySelector("[data-visual-src]")?.getAttribute("data-visual-src")).toBe("/images/body-types/red/suv.png");
    expect(container.querySelector("[data-body-mask-src]")?.getAttribute("data-body-mask-src")).toBe("");
  });

  it.each(["suv", "sedan", "hatchback", "coupe", "wagon", "convertible", "minivan", "pickup", "van", "minibus", "liftback", "crossover-coupe"] as const)("renders a stable %s fallback for an unknown model", (bodyType) => {
    container = document.createElement("div");
    document.body.append(container);
    act(() => createRoot(container!).render(<VehicleModelRenderer vehicle={{ ...baseVehicle("Other", "Unknown", "#dc2626"), bodyType }} />));
    expect(container.querySelector('[data-visual-model="generic-' + bodyType + '"]')).not.toBeNull();
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it("uses one normalized contain frame for every selected template", () => {
    container = document.createElement("div");
    document.body.append(container);
    act(() => createRoot(container!).render(<VehicleModelRenderer vehicle={baseVehicle("Tank", "300", "#dc2626")} />));
    expect(container.querySelector("[data-visual-src]")?.getAttribute("data-visual-src")).toBe("/images/body-types/red/suv.png");
    const image = container.querySelector('[data-vehicle-layer="original"]');
    expect(image).toMatchObject({});
    expect(image?.getAttribute("x")).toBe("0");
    expect(image?.getAttribute("y")).toBe("0");
    expect(image?.getAttribute("width")).toBe("640");
    expect(image?.getAttribute("height")).toBe("360");
    expect(image?.getAttribute("preserveAspectRatio")).toBe("xMidYMax meet");
  });
});
