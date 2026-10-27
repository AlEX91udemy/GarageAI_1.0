export interface AgentServiceEnvironment {
  AGENTS_SERVICE_URL?: string;
  AGENTS_SERVICE_AUDIENCE?: string;
  AGENTS_API_TOKEN?: string;
  NODE_ENV?: string;
}

export interface AgentServiceRequest {
  task: string;
  agents?: string[];
}

export interface AgentServiceResponse {
  task: string;
  results: Record<string, string>;
}

export class AgentServiceClientError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly retryAfter?: string,
  ) {
    super(message);
    this.name = "AgentServiceClientError";
  }
}

async function readBoundedResponseText(response: Response, maximumBytes: number): Promise<string> {
  const headerLength = response.headers.get("content-length");
  if (headerLength && /^\d+$/.test(headerLength) && Number(headerLength) > maximumBytes) {
    throw new Error("Agent response exceeds the size limit.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let output = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new Error("Agent response exceeds the size limit.");
      }
      output += decoder.decode(value, { stream: true });
    }
    output += decoder.decode();
    return output;
  } finally {
    reader.releaseLock();
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * Calls the private ADK service. In Cloud Run, obtain an ID token from the
 * metadata server so Cloud Run IAM (run.invoker) is the primary boundary.
 * The application token remains a second, independent authentication layer.
 */
export async function runAgentService(
  env: AgentServiceEnvironment,
  payload: AgentServiceRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<AgentServiceResponse> {
  const baseValue = env.AGENTS_SERVICE_URL?.trim();
  const appToken = env.AGENTS_API_TOKEN?.trim();
  if (!baseValue || !appToken) {
    throw new AgentServiceClientError("Agent service is not configured.", 503);
  }

  let base: URL;
  try {
    base = new URL(baseValue);
  } catch {
    throw new AgentServiceClientError("Agent service URL is invalid.", 503);
  }

  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new AgentServiceClientError("Agent service URL is invalid.", 503);
  }
  const isProduction = env.NODE_ENV === "production";
  if (isProduction && base.protocol !== "https:") {
    throw new AgentServiceClientError("Agent service must use HTTPS in production.", 503);
  }

  const endpoint = new URL("/agents/run", base.origin);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-agents-token": appToken,
  };

  if (isProduction) {
    const audience = env.AGENTS_SERVICE_AUDIENCE?.trim() || base.origin;
    let audienceUrl: URL;
    try {
      audienceUrl = new URL(audience);
    } catch {
      throw new AgentServiceClientError("Agent service audience is invalid.", 503);
    }
    if (audienceUrl.protocol !== "https:") {
      throw new AgentServiceClientError("Agent service audience must use HTTPS.", 503);
    }

    const metadataUrl = new URL(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity",
    );
    metadataUrl.searchParams.set("audience", audience);
    let identityResponse: Response;
    try {
      identityResponse = await fetchImpl(metadataUrl, {
        headers: { "metadata-flavor": "Google" },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new AgentServiceClientError("Could not obtain Cloud Run service identity.", 502);
    }
    if (!identityResponse.ok) {
      throw new AgentServiceClientError("Could not obtain Cloud Run service identity.", 502);
    }
    const identityToken = (await identityResponse.text()).trim();
    if (!identityToken || identityToken.length > 12000) {
      throw new AgentServiceClientError("Cloud Run returned an invalid service identity token.", 502);
    }
    headers.authorization = "Bearer " + identityToken;
  }

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new AgentServiceClientError("Agent service request timed out.", 504);
    }
    throw new AgentServiceClientError("Agent service is temporarily unavailable.", 502);
  }

  if (response.status === 429) {
    throw new AgentServiceClientError(
      "Agent service rate limit reached.",
      429,
      response.headers.get("retry-after") ?? undefined,
    );
  }
  if (!response.ok) {
    throw new AgentServiceClientError("Agent service rejected or failed the request.", 502);
  }

  let parsed: unknown;
  try {
    const text = await readBoundedResponseText(response, 250000);
    parsed = JSON.parse(text);
  } catch {
    throw new AgentServiceClientError("Agent service returned an invalid response.", 502);
  }

  const record = asRecord(parsed);
  const results = asRecord(record?.results);
  if (
    !record ||
    typeof record.task !== "string" ||
    !results ||
    Object.values(results).some((value) => typeof value !== "string")
  ) {
    throw new AgentServiceClientError("Agent service returned an invalid response.", 502);
  }

  return { task: record.task, results: results as Record<string, string> };
}
