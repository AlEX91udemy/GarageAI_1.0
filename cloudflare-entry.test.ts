import { describe, expect, it } from "vitest";
import { apiRequest } from "./cloudflare-entry";

describe("Cloudflare API proxy boundary", () => {
  it("does not forward caller-controlled proxy identity headers", () => {
    const request = new Request("https://garageai.site/api/health?check=1", {
      headers: {
        "x-forwarded-for": "203.0.113.9",
        "x-real-ip": "203.0.113.9",
        forwarded: "for=203.0.113.9",
        "cf-connecting-ip": "198.51.100.7",
        accept: "application/json",
      },
    });

    const forwarded = apiRequest(request, "https://origin.example");

    expect(forwarded.url).toBe("https://origin.example/api/health?check=1");
    expect(forwarded.headers.get("x-forwarded-for")).toBe("198.51.100.7");
    expect(forwarded.headers.get("x-real-ip")).toBeNull();
    expect(forwarded.headers.get("forwarded")).toBeNull();
    expect(forwarded.headers.get("accept")).toBe("application/json");
  });

  it("preserves API method and body while rebuilding the request", async () => {
    const request = new Request("https://garageai.site/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "demo", password: "secret" }),
    });

    const forwarded = apiRequest(request, "https://origin.example");

    expect(forwarded.method).toBe("POST");
    expect(await forwarded.json()).toEqual({ username: "demo", password: "secret" });
  });
});
