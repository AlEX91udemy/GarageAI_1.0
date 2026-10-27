import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchGarageData,
  runGarageAiAgents,
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


describe("runGarageAiAgents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the requested task and returns agent results", async () => {
    const payload = { task: "Audit tenant isolation", agents: ["qa"] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      task: payload.task,
      results: { qa: "No cross-user leak found." },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(runGarageAiAgents(payload)).resolves.toEqual({
      task: payload.task,
      results: { qa: "No cross-user leak found." },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/agents/run", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(payload),
    }));
  });

  it("surfaces sanitized server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "AI-агенты не настроены на сервере.",
    }), { status: 503, headers: { "content-type": "application/json" } })));

    await expect(runGarageAiAgents({ task: "Audit" })).rejects.toThrow("AI-агенты не настроены на сервере.");
  });

  it("rejects malformed agent response shapes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      task: "Audit",
      results: { qa: 123 },
    }), { status: 200, headers: { "content-type": "application/json" } })));

    await expect(runGarageAiAgents({ task: "Audit" })).rejects.toThrow("Сервис AI-агентов вернул некорректный ответ");
  });
});
