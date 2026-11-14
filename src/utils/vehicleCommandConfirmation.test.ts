import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { confirmVehicleCommand } from "./vehicleCommandConfirmation";

describe("confirmVehicleCommand", () => {
  let originalConfirm: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalConfirm = Object.getOwnPropertyDescriptor(window, "confirm");
  });

  afterEach(() => {
    if (originalConfirm) {
      Object.defineProperty(window, "confirm", originalConfirm);
    } else {
      Reflect.deleteProperty(window, "confirm");
    }
    vi.restoreAllMocks();
  });

  it("runs a vehicle command once after confirmation", () => {
    const confirm = vi.fn(() => true);
    Object.defineProperty(window, "confirm", { configurable: true, value: confirm });
    const command = vi.fn();

    expect(confirmVehicleCommand("Confirm change", command)).toBe(true);
    expect(confirm).toHaveBeenCalledWith("Confirm change");
    expect(command).toHaveBeenCalledTimes(1);
  });

  it("does not run a vehicle command when confirmation is declined", () => {
    Object.defineProperty(window, "confirm", { configurable: true, value: vi.fn(() => false) });
    const command = vi.fn();

    expect(confirmVehicleCommand("Confirm change", command)).toBe(false);
    expect(command).not.toHaveBeenCalled();
  });
});
