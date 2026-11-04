import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, describeError, request, session } from "./client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  session.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("request", () => {
  it("sends the access token as a bearer header", async () => {
    session.set("access-1", "refresh-1");
    fetchMock.mockResolvedValue(json({ ok: true }));
    await request("GET", "/sections");
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer access-1");
  });

  it("refreshes once on 401 and retries the original request", async () => {
    session.set("old", "refresh-1");
    fetchMock
      .mockResolvedValueOnce(json({ detail: "expired" }, 401))
      .mockResolvedValueOnce(json({ access_token: "new", refresh_token: "refresh-2" }))
      .mockResolvedValueOnce(json([{ id: 1 }]));
    expect(await request("GET", "/sections")).toEqual([{ id: 1 }]);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh");
    expect((fetchMock.mock.calls[2][1].headers as Headers).get("Authorization")).toBe("Bearer new");
    expect(localStorage.getItem("ceevee.refresh")).toBe("refresh-2");
  });

  it("shares one refresh between parallel 401s", async () => {
    session.set("old", "refresh-1");
    let refreshCalls = 0;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.includes("/auth/refresh")) {
        refreshCalls++;
        return json({ access_token: "new", refresh_token: "refresh-2" });
      }
      const auth = (init.headers as Headers).get("Authorization");
      return auth === "Bearer new" ? json({ ok: true }) : json({ detail: "expired" }, 401);
    });
    await Promise.all([request("GET", "/a"), request("GET", "/b"), request("GET", "/c")]);
    expect(refreshCalls).toBe(1);
  });

  it("clears the session and signals expiry when refresh fails", async () => {
    session.set("old", "refresh-1");
    const expired = vi.fn();
    session.onExpired(expired);
    fetchMock.mockResolvedValueOnce(json({ detail: "expired" }, 401)).mockResolvedValueOnce(json({ detail: "bad" }, 401));
    await expect(request("GET", "/sections")).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledOnce();
    expect(session.hasRefreshToken()).toBe(false);
  });

  it("does not try to refresh when there is no refresh token", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Incorrect email or password." }, 401));
    await expect(request("POST", "/auth/login", {})).rejects.toMatchObject({ status: 401, message: "Incorrect email or password." });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await request("DELETE", "/sections/1")).toBeUndefined();
  });
});

describe("describeError", () => {
  it("passes plain string details through", () => expect(describeError({ detail: "Nope" }, "x")).toBe("Nope"));
  it("flattens validation errors", () => {
    const body = { detail: [{ loc: ["body", "email"], msg: "invalid email" }, { loc: ["body", "password"], msg: "too short" }] };
    expect(describeError(body, "x")).toBe("email: invalid email; password: too short");
  });
  it("falls back when there is no detail", () => expect(describeError(null, "Request failed (500)")).toBe("Request failed (500)"));
});
