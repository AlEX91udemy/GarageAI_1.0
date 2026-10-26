interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  API_ORIGIN?: string;
}

function apiRequest(request: Request, origin: string): Request {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, origin.endsWith("/") ? origin : origin + "/");
  return new Request(target, request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      if (!env.API_ORIGIN) return Response.json({ error: "API origin is not configured" }, { status: 503 });
      try { return await fetch(apiRequest(request, env.API_ORIGIN)); }
      catch { return Response.json({ error: "API is unavailable" }, { status: 502 }); }
    }
    return env.ASSETS.fetch(request);
  },
};
