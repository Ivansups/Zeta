/**
 * @jest-environment node
 */

let api: (typeof import("./api"))["api"];

type FakeLocation = {
  pathname: string;
  search: string;
  href: string;
};

const originalFetch = global.fetch;

function setWindowLocation(pathname: string, search = ""): FakeLocation {
  const location: FakeLocation = {
    pathname,
    search,
    href: `${pathname}${search}`,
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { location },
  });

  return location;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("api client: 401 interceptor and silent refresh", () => {
  beforeEach(async () => {
    // The client keeps module-level refresh state; start every case clean.
    jest.resetModules();
    ({ api } = await import("./api"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "window");
  });

  it("returns data directly on successful requests without 401", async () => {
    setWindowLocation("/homework", "?subgroup=2");
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: "user-1", telegram_id: 12345, role: "student" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = await api.getMe();

    expect(user).toEqual({ id: "user-1", telegram_id: 12345, role: "student" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes the session on 401 and retries the original request", async () => {
    const location = setWindowLocation("/homework", "?subgroup=2");
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "Access token expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: "new_access_token" }))
      .mockResolvedValueOnce(jsonResponse({ id: "user-1", telegram_id: 12345, role: "student" }));

    const user = await api.getMe();

    expect(user).toEqual({ id: "user-1", telegram_id: 12345, role: "student" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/me");
    expect(fetchMock.mock.calls[1]).toEqual(["/api/auth/refresh", { method: "POST" }]);
    expect(fetchMock.mock.calls[2][0]).toBe("/api/auth/me");
    // On the happy path the user stays on the current screen.
    expect(location.href).toBe("/homework?subgroup=2");
  });

  it("redirects to /login with a next parameter when refresh fails", async () => {
    const location = setWindowLocation("/homework", "?subgroup=2");
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "Access token expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: "Refresh token expired" }, 401));

    const user = await api.getMe();

    expect(user).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(location.href).toBe("/login?next=%2Fhomework%3Fsubgroup%3D2");
  });

  it("does not rotate twice for late 401 responses after a refresh", async () => {
    setWindowLocation("/settings");
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      // first request: 401 -> refresh -> retry succeeds
      .mockResolvedValueOnce(jsonResponse({ detail: "Expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: "new_token" }))
      .mockResolvedValueOnce(jsonResponse({ id: "user-1", telegram_id: 1, role: "student" }))
      // a request that was already in flight with the old token
      .mockResolvedValueOnce(jsonResponse({ detail: "Expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ id: "user-1", telegram_id: 1, role: "student" }));

    await api.getMe();
    await api.getMe();

    const refreshCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === "/api/auth/refresh",
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("keeps the user in place when the refresh request fails at the network level", async () => {
    const location = setWindowLocation("/homework");
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "Expired" }, 401))
      .mockRejectedValueOnce(new Error("Failed to fetch"));

    const user = await api.getMe();

    expect(user).toBeNull();
    expect(location.href).toBe("/homework");
  });

  it("keeps the user in place when the refresh endpoint fails with 5xx", async () => {
    const location = setWindowLocation("/homework");
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "Expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: "Internal error" }, 500));

    const user = await api.getMe();

    expect(user).toBeNull();
    expect(location.href).toBe("/homework");
  });

  it("redirects when the retried request is still unauthorized", async () => {
    const location = setWindowLocation("/admin");
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "Expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: "new_access_token" }))
      .mockResolvedValueOnce(jsonResponse({ detail: "Forbidden" }, 401));

    const user = await api.getMe();

    expect(user).toBeNull();
    expect(location.href).toBe("/login?next=%2Fadmin");
  });

  it("does not redirect again when already on the login page", async () => {
    const location = setWindowLocation("/login", "?next=%2Fhomework");
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "Unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: "Unauthorized" }, 401));

    await api.getMe();

    expect(location.href).toBe("/login?next=%2Fhomework");
  });

  it("deduplicates concurrent 401 refresh calls", async () => {
    setWindowLocation("/homework");
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "Expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: "Expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: "new_token" }))
      .mockResolvedValueOnce(jsonResponse({ id: "user-1", telegram_id: 1, role: "student" }))
      .mockResolvedValueOnce(jsonResponse([]));

    const [user, users] = await Promise.all([api.getMe(), api.listUsers()]);

    expect(user).toEqual({ id: "user-1", telegram_id: 1, role: "student" });
    expect(users).toEqual([]);

    const refreshCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === "/api/auth/refresh",
    );
    expect(refreshCalls).toHaveLength(1);
  });
});
