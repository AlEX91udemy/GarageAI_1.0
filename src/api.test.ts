import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchGarageData,
  importDatabaseBackup,
  runGarageAiAgents,
  resetDatabase,
  deleteAccount,
  requestReceiptOcr,
  requestVehicleDocumentOcr,
  requestDocumentOcr,
  fetchVehicleRecommendations,
  fetchPublicKnowledgeSources,
  refreshPublicKnowledgeSources,
  register,
  type GarageAiAgentName,
} from "./api";

describe("account-scoped backup APIs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resets only through the authenticated account endpoint", async () => {
    const data = {
      vehicles: [], reminders: [], serviceRecords: [], fuelRecords: [], oemSchedules: [],
      garageParts: [], toFixTasks: [], tuningStages: [], lastUpdated: "2026-01-01T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resetDatabase()).resolves.toEqual(data);
    expect(fetchMock).toHaveBeenCalledWith("/api/backup/reset", expect.objectContaining({ method: "POST" }));
    expect(fetchMock.mock.calls[0][1].headers.get("x-admin-key")).toBeNull();
  });

  it("imports the supplied account backup without an admin header", async () => {
    const backup = {
      vehicles: [], reminders: [], serviceRecords: [], fuelRecords: [], oemSchedules: [],
      garageParts: [], toFixTasks: [], tuningStages: [], lastUpdated: "2026-01-01T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(importDatabaseBackup(backup)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/backup/import", expect.objectContaining({ method: "POST" }));
    expect(fetchMock.mock.calls[0][1].headers.get("x-admin-key")).toBeNull();
  });

  it("deletes an account only through the authenticated endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteAccount("CurrentPassword-123!")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/account", expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({ password: "CurrentPassword-123!" }),
    }));
    expect(fetchMock.mock.calls[0][1].headers.get("x-admin-key")).toBeNull();
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

describe("registration email verification contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a pending state without creating a client session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ pendingEmailVerification: true, email: "new@example.test", message: "check inbox" }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(register("new-user", "Password-123!", "new@example.test")).resolves.toMatchObject({ pendingEmailVerification: true, email: "new@example.test" });
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ username: "new-user", password: "Password-123!", email: "new@example.test" }));
  });
});

describe("knowledge recommendation APIs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends only technical vehicle context and returns recommendations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ recommendations: [], sources: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchVehicleRecommendations({ make: "Toyota", model: "Camry", vin: "SECRET", licensePlate: "A123AA", currentMileage: 120000 }, "тормоза")).resolves.toEqual({ recommendations: [], sources: [] });
    const requestUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestUrl).not.toContain("SECRET");
    expect(requestUrl).not.toContain("A123AA");
    expect(decodeURIComponent(requestUrl)).toContain("тормоза");
  });

  it("loads the public source registry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources: [{ id: "source-nhtsa-owner" }], generatedAt: "2026-11-14", note: "note" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchPublicKnowledgeSources()).resolves.toMatchObject({ generatedAt: "2026-11-14", sources: [{ id: "source-nhtsa-owner" }] });
    expect(fetchMock).toHaveBeenCalledWith("/api/knowledge/sources", expect.anything());
  });

  it("refreshes source availability on demand", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ checkedAt: "2026-11-14T10:00:00.000Z", statuses: [{ sourceId: "source-avtovaz-manuals", checkedAt: "2026-11-14T10:00:00.000Z", status: "network_error" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(refreshPublicKnowledgeSources()).resolves.toMatchObject({ statuses: [{ sourceId: "source-avtovaz-manuals", status: "network_error" }] });
    expect(fetchMock).toHaveBeenCalledWith("/api/knowledge/sources/refresh", expect.objectContaining({ method: "POST" }));
  });
});

describe("OCR scanner API contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends receipt images and returns an object response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ category: "fuel", totalAmount: 2500 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestReceiptOcr("data:image/jpeg;base64,AAAA", "image/jpeg")).resolves.toEqual({ category: "fuel", totalAmount: 2500 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/ai/scan-receipt");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ imageBase64: "data:image/jpeg;base64,AAAA", mimeType: "image/jpeg" });
  });

  it("rejects malformed OCR response shapes for all scanner endpoints", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })));

    await expect(requestReceiptOcr("AAAA")).rejects.toThrow("Сервис OCR вернул некорректный ответ");
    await expect(requestVehicleDocumentOcr("AAAA")).rejects.toThrow("Сервис OCR СТС вернул некорректный ответ");
    await expect(requestDocumentOcr("AAAA")).rejects.toThrow("Сервис OCR документа вернул некорректный ответ");
  });

  it("requires text in full-document OCR responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources: {} }), { status: 200 })));
    await expect(requestDocumentOcr("AAAA")).rejects.toThrow("Сервис OCR документа вернул некорректный ответ");
  });
});


describe("runGarageAiAgents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the requested task and returns agent results", async () => {
    const payload: { task: string; agents: GarageAiAgentName[] } = { task: "Audit tenant isolation", agents: ["qa"] };
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
