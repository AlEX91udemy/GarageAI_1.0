import { describe, expect, it, vi } from "vitest";
import { AgentServiceClientError, runAgentService } from "./agentServiceClient";

describe("private agent service client", () => {
  it("fails closed when URL or application token is missing", async () => {
    await expect(runAgentService({}, { task: "Audit project" })).rejects.toMatchObject({
      name: "AgentServiceClientError",
      statusCode: 503,
    });
  });

  it("sends the application token when called in local development", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify({
        task: "Check the API",
        results: { qa: "No blocking defects found." },
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const response = await runAgentService({
      AGENTS_SERVICE_URL: "http://127.0.0.1:8081",
      AGENTS_API_TOKEN: "local-test-token",
      NODE_ENV: "development",
    }, { task: "Check the API", agents: ["qa"] }, fetchMock, "user-123");

    expect(response).toEqual({ task: "Check the API", results: { qa: "No blocking defects found." } });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://127.0.0.1:8081/agents/run");
    expect((calls[0].init?.headers as Record<string, string>)["x-agents-token"]).toBe("local-test-token");
    expect((calls[0].init?.headers as Record<string, string>)["x-agents-caller"]).toBe("user-123");
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("obtains a Cloud Run ID token and sends both authentication layers in production", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.startsWith("http://metadata.google.internal/")) {
        expect((init?.headers as Record<string, string>)["metadata-flavor"]).toBe("Google");
        expect(init?.redirect).toBe("error");
        return new Response("cloud-run-id-token", { status: 200 });
      }
      expect(init?.redirect).toBe("error");
      return new Response(JSON.stringify({ task: "Run qa", results: { qa: "passed" } }), { status: 200 });
    };

    const result = await runAgentService({
      AGENTS_SERVICE_URL: "https://garageai-agents-example.run.app",
      AGENTS_SERVICE_AUDIENCE: "https://garageai-agents-example.run.app",
      AGENTS_API_TOKEN: "private-app-token",
      NODE_ENV: "production",
    }, { task: "Run qa", agents: ["qa"] }, fetchMock);

    expect(result.results.qa).toBe("passed");
    expect(calls).toHaveLength(2);
    const serviceCall = calls[1];
    expect(serviceCall.url).toBe("https://garageai-agents-example.run.app/agents/run");
    const headers = serviceCall.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer cloud-run-id-token");
    expect(headers["x-agents-token"]).toBe("private-app-token");
  });

  it("rejects non-HTTPS production endpoints before making a request", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(runAgentService({
      AGENTS_SERVICE_URL: "http://garageai-agents.example",
      AGENTS_API_TOKEN: "private-app-token",
      NODE_ENV: "production",
    }, { task: "Run qa" }, fetchMock)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops reading an oversized agent response", async () => {
    const fetchMock: typeof fetch = async () => new Response("x".repeat(260000), { status: 200 });
    await expect(runAgentService({
      AGENTS_SERVICE_URL: "http://127.0.0.1:8081",
      AGENTS_API_TOKEN: "local-test-token",
      NODE_ENV: "development",
    }, { task: "Run qa" }, fetchMock)).rejects.toMatchObject({
      name: "AgentServiceClientError",
      statusCode: 502,
    });
  });

  it("rejects malformed upstream responses without exposing raw contents", async () => {
    const fetchMock: typeof fetch = async () => new Response("not-json", { status: 200 });
    await expect(runAgentService({
      AGENTS_SERVICE_URL: "http://127.0.0.1:8081",
      AGENTS_API_TOKEN: "local-test-token",
      NODE_ENV: "development",
    }, { task: "Run qa" }, fetchMock)).rejects.toBeInstanceOf(AgentServiceClientError);
  });
});
