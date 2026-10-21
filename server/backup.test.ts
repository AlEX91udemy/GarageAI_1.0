import { describe, expect, it } from "vitest";
import { validateGarageBackup } from "./backup";

const vehicle = { id: "car-1", make: "Lada", model: "Vesta" };
const reminder = { id: "reminder-1", vehicleId: "car-1", kind: "osago", startDate: "2026-01-01" };

describe("garage backup", () => {
  it("restores reminders and accepts an older backup without them", () => {
    expect(validateGarageBackup({ vehicles: [vehicle], reminders: [reminder] }).reminders).toEqual([reminder]);
    expect(validateGarageBackup({ vehicles: [vehicle] }).reminders).toEqual([]);
  });

  it("rejects broken references and duplicate IDs before changing the garage", () => {
    expect(() => validateGarageBackup({ vehicles: [vehicle], reminders: [{ ...reminder, vehicleId: "missing" }] })).toThrow();
    expect(() => validateGarageBackup({ vehicles: [vehicle, vehicle] })).toThrow();
    expect(() => validateGarageBackup({ vehicles: [vehicle], reminders: [reminder, reminder] })).toThrow();
  });
});
