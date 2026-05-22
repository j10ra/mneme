// Dashboard API client. All endpoints live under /dashboard/api/* on
// the daemon (loopback only, no auth). The daemon proxies anything
// memory-shaped to the server using cfg.auth.key; local-only data
// (this machine's logs, outbox state) is read directly from disk.
//
// Keep this file dumb: typed fetch wrappers + an SSE helper. Per-panel
// data shapes live next to the panel components, not here.

const API_BASE = "/dashboard/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new ApiError(`${path} failed: ${resp.status} ${text.slice(0, 200)}`, resp.status);
  }
  return (await resp.json()) as T;
}

/** POST to a /dashboard/api/* endpoint. Sends `body` as JSON when
 *  provided. Throws ApiError on a non-2xx response, same as apiGet. */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new ApiError(`${path} failed: ${resp.status} ${text.slice(0, 200)}`, resp.status);
  }
  return (await resp.json()) as T;
}

/** Open an SSE stream to the daemon. Caller listens with addEventListener
 *  and disposes via the returned close fn. Reconnect logic is browser
 *  native (EventSource handles dropped connections). */
export function openStream(path: string): EventSource {
  const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  return new EventSource(url);
}
