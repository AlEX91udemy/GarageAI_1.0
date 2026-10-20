import { describe, expect, it } from "vitest";
import { CAR_CATALOG, findModel, getModelBodyTypes } from "./carCatalog";

describe("Russian popular vehicle catalog", () => {
  it("contains 200 unique make/model combinations", () => {
    const models = CAR_CATALOG.flatMap((make) => make.models.map((model) => make.name + "|" + model.name).map((key) => key.toLowerCase()));
    expect(models).toHaveLength(200);
    expect(new Set(models).size).toBe(200);
  });

  it("limits a model to body types available across its generations", () => {
    const almera = findModel("Nissan", "Almera");
    expect(getModelBodyTypes(almera!)).toEqual(["sedan", "hatchback"]);
    expect(almera?.generations.find((generation) => generation.name.startsWith("G15"))?.bodyTypes.map((body) => body.type))
      .toEqual(["sedan"]);
  });

  it("provides at least one explicit body type for every catalog model", () => {
    for (const make of CAR_CATALOG) {
      for (const model of make.models) {
        expect(getModelBodyTypes(model).length, make.name + " " + model.name).toBeGreaterThan(0);
      }
    }
  });
});
