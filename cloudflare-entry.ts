interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  API_ORIGIN?: string;
}

export function apiRequest(request: Request, origin: string): Request {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, origin.endsWith("/") ? origin : origin + "/");
  const headers = new Headers(request.headers);
  // The browser can submit these headers directly. Strip them before the
  // Worker forwards the request, then provide the edge-observed client address
  // as the single trusted proxy hop expected by Express at the origin.
  headers.delete("x-forwarded-for");
  headers.delete("x-real-ip");
  headers.delete("forwarded");
  const edgeClientIp = request.headers.get("cf-connecting-ip")?.trim();
  if (edgeClientIp && /^[0-9a-f:.]+$/i.test(edgeClientIp)) {
    headers.set("x-forwarded-for", edgeClientIp);
  }
  return new Request(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
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
