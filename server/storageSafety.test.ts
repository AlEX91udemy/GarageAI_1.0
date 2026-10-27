import { describe, expect, it } from "vitest";
import { assertProductionStorageSafe } from "./storageSafety";

describe("production storage safety", () => {
  it("blocks production when only ephemeral JSON storage is configured", () => {
    expect(() => assertProductionStorageSafe({ NODE_ENV: "production" })).toThrow(
      /Production startup blocked: GarageAI still uses local JSON files/,
    );
  });

  it("allows local development and test environments", () => {
    expect(() => assertProductionStorageSafe({ NODE_ENV: "development" })).not.toThrow();
    expect(() => assertProductionStorageSafe({ NODE_ENV: "test" })).not.toThrow();
  });

  it("allows production only when PostgreSQL is configured or demo override is explicit", () => {
    expect(() => assertProductionStorageSafe({ NODE_ENV: "production", DATABASE_URL: "postgres://configured" })).not.toThrow();
    expect(() => assertProductionStorageSafe({ NODE_ENV: "production", DATABASE_URL: "  " })).toThrow(/Production startup blocked/);
  });

  it("requires explicit opt-in for a temporary production demo", () => {
    expect(() => assertProductionStorageSafe({
      NODE_ENV: "production",
      GARAGE_ALLOW_EPHEMERAL_STORAGE: "true",
    })).not.toThrow();
    expect(() => assertProductionStorageSafe({
      NODE_ENV: "production",
      GARAGE_ALLOW_EPHEMERAL_STORAGE: "false",
    })).toThrow(/Production startup blocked/);
  });
});
