import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchGarageData,
  getAdminToken,
  setAdminToken,
} from "./api";

describe("admin session", () => {
  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("keeps the signed admin token only for the current browser session", () => {
    setAdminToken("signed-token");

    expect(getAdminToken()).toBe("signed-token");
    expect(sessionStorage.getItem("garagehub_admin_token")).toBe("signed-token");
    expect(localStorage.getItem("garagehub_admin_token")).toBeNull();
  });

  it("clears the admin token", () => {
    setAdminToken("signed-token");
    setAdminToken(null);

    expect(getAdminToken()).toBeNull();
  });
});

describe("fetchGarageData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns server data for a successful response", async () => {
    const data = {
      vehicles: [], serviceRecords: [], fuelRecords: [], oemSchedules: [],
      garageParts: [], toFixTasks: [], tuningStages: [], lastUpdated: "2026-01-01T00:00:00.000Z",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status: 200 })));

    await expect(fetchGarageData()).resolves.toEqual(data);
  });

  it("rejects a failed server response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(fetchGarageData()).rejects.toThrow("Ошибка загрузки данных с сервера: 503");
  });
});
