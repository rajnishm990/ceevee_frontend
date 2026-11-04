const BASE: string = import.meta.env.VITE_API_BASE ?? "";
const REFRESH_KEY = "ceevee.refresh";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let onSessionExpired: () => void = () => {};

export const session = {
  set(access: string, refresh: string) {
    accessToken = access;
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
  hasRefreshToken: () => localStorage.getItem(REFRESH_KEY) !== null,
  onExpired(handler: () => void) {
    onSessionExpired = handler;
  },
};

export function describeError(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: (string | number)[]; msg?: string }) => `${(d.loc ?? []).slice(1).join(".")}: ${d.msg ?? "invalid"}`)
      .join("; ");
  }
  return fallback;
}

export async function refreshSession(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return false;
      const tokens = await res.json();
      session.set(tokens.access_token, tokens.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function send(path: string, init: RequestInit, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const res = await fetch(`${BASE}/api/v1${path}`, { ...init, headers });

  if (res.status === 401 && retry && session.hasRefreshToken()) {
    if (await refreshSession()) return send(path, init, false);
    session.clear();
    onSessionExpired();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, describeError(body, `Request failed (${res.status})`));
  }
  return res;
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await send(path, jsonInit(method, body));
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export async function requestBlob(method: string, path: string, body?: unknown): Promise<Blob> {
  return (await send(path, jsonInit(method, body))).blob();
}

export async function upload<T>(path: string, form: FormData): Promise<T> {
  return (await (await send(path, { method: "POST", body: form })).json()) as T;
}
