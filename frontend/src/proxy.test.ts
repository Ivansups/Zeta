/**
 * @jest-environment node
 */
import { NextRequest, type NextResponse } from "next/server";

const originalFetch = global.fetch;
const API_URL = "http://backend:8000";
const DOCUMENT_HEADERS = { accept: "text/html,application/xhtml+xml" };

let proxy: (request: NextRequest) => Promise<NextResponse>;

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

function makeRequest(
  path: string,
  options: {
    accessToken?: string;
    refreshToken?: string;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const request = new NextRequest(new URL(`http://localhost${path}`), {
    headers: options.headers,
  });
  if (options.accessToken) {
    request.cookies.set("access_token", options.accessToken);
  }
  if (options.refreshToken) {
    request.cookies.set("refresh_token", options.refreshToken);
  }
  return request;
}

function refreshResponse(): Response {
  const headers = new Headers();
  headers.append(
    "set-cookie",
    "access_token=new_access; Path=/; HttpOnly; SameSite=Lax",
  );
  headers.append(
    "set-cookie",
    "refresh_token=new_refresh; Path=/; HttpOnly; SameSite=Lax",
  );
  return new Response(JSON.stringify({ access_token: "new_access" }), {
    status: 200,
    headers,
  });
}

function setCookiesOf(response: Response): string[] {
  return response.headers.getSetCookie();
}

describe("proxy", () => {
  beforeEach(async () => {
    // The module keeps in-memory rotation caches; start every case clean.
    jest.resetModules();
    ({ proxy } = await import("./proxy"));
    process.env.API_URL = API_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.API_URL;
    jest.restoreAllMocks();
  });

  it("redirects to /login when there is no session at all", async () => {
    const response = await proxy(makeRequest("/", { headers: DOCUMENT_HEADERS }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("keeps the requested page in the next parameter", async () => {
    const response = await proxy(makeRequest("/admin", { headers: DOCUMENT_HEADERS }));

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fadmin",
    );
  });

  it("keeps query parameters in the next parameter", async () => {
    const response = await proxy(
      makeRequest("/homework?subgroup=2", { headers: DOCUMENT_HEADERS }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fhomework%3Fsubgroup%3D2",
    );
  });

  it("passes protected pages through without a refresh when the access token is valid", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await proxy(
      makeRequest("/admin", {
        accessToken: jwt({ exp: Math.floor(Date.now() / 1000) + 600 }),
        refreshToken: "refresh",
        headers: DOCUMENT_HEADERS,
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes the session when the access token has expired", async () => {
    const fetchMock = jest.fn().mockResolvedValue(refreshResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await proxy(
      makeRequest("/admin", {
        accessToken: jwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
        refreshToken: "refresh",
        headers: DOCUMENT_HEADERS,
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/auth/refresh`);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[0][1].headers.cookie).toBe(
      "refresh_token=refresh",
    );

    const setCookies = setCookiesOf(response);
    expect(setCookies.join("\n")).toContain("access_token=new_access");
    expect(setCookies.join("\n")).toContain("refresh_token=new_refresh");
  });

  it("refreshes the session when only the refresh token is left", async () => {
    const fetchMock = jest.fn().mockResolvedValue(refreshResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await proxy(
      makeRequest("/", {
        refreshToken: "refresh",
        headers: DOCUMENT_HEADERS,
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes the rotated cookies to the rendered request", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(refreshResponse()) as unknown as typeof fetch;

    const response = await proxy(
      makeRequest("/admin", {
        accessToken: jwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
        refreshToken: "refresh",
        headers: DOCUMENT_HEADERS,
      }),
    );

    const forwardedCookies = response.headers.get("x-middleware-request-cookie");
    expect(forwardedCookies).toContain("access_token=new_access");
    expect(forwardedCookies).toContain("refresh_token=new_refresh");
  });

  it("clears the session and redirects when the refresh token is rejected", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 })) as unknown as typeof fetch;

    const response = await proxy(
      makeRequest("/admin", {
        accessToken: jwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
        refreshToken: "revoked",
        headers: DOCUMENT_HEADERS,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fadmin",
    );
    const setCookies = setCookiesOf(response).join("\n");
    expect(setCookies).toContain("access_token=;");
    expect(setCookies).toContain("refresh_token=;");
  });

  it("keeps the session when the backend is unreachable", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("connect ECONNREFUSED")) as unknown as typeof fetch;

    const response = await proxy(
      makeRequest("/admin", {
        accessToken: jwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
        refreshToken: "refresh",
        headers: DOCUMENT_HEADERS,
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(setCookiesOf(response).join("\n")).not.toContain("access_token=;");
  });

  it("does not refresh non-document (RSC/prefetch) requests", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await proxy(
      makeRequest("/admin", {
        accessToken: jwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
        refreshToken: "refresh",
        headers: { accept: "text/x-component" },
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares one rotation between parallel requests", async () => {
    const fetchMock = jest.fn().mockResolvedValue(refreshResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const request = (): NextRequest =>
      makeRequest("/admin", {
        accessToken: jwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
        refreshToken: "refresh",
        headers: DOCUMENT_HEADERS,
      });

    await Promise.all([proxy(request()), proxy(request())]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses a fresh rotation for requests that still carry the old token", async () => {
    const fetchMock = jest.fn().mockResolvedValue(refreshResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const request = (): NextRequest =>
      makeRequest("/admin", {
        accessToken: jwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
        refreshToken: "refresh",
        headers: DOCUMENT_HEADERS,
      });

    await proxy(request());
    const second = await proxy(request());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setCookiesOf(second).join("\n")).toContain("access_token=new_access");
  });

  it("redirects when the access token expired and there is no refresh token", async () => {
    const response = await proxy(
      makeRequest("/homework", {
        accessToken: jwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
        headers: DOCUMENT_HEADERS,
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fhomework",
    );
    expect(setCookiesOf(response).join("\n")).toContain("access_token=;");
  });

  it("falls back to the optimistic check when API_URL is not configured", async () => {
    delete process.env.API_URL;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await proxy(
      makeRequest("/admin", {
        refreshToken: "refresh",
        headers: DOCUMENT_HEADERS,
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["/login", "/tg-app", "/invite"])("keeps %s public", async (path) => {
    const response = await proxy(makeRequest(path, { headers: DOCUMENT_HEADERS }));

    expect(response.headers.get("location")).toBeNull();
  });

  it("never blocks the API proxy route", async () => {
    const response = await proxy(makeRequest("/api/auth/me"));

    expect(response.headers.get("location")).toBeNull();
  });
});
