/** @jest-environment node */

import { GET, POST } from "./route";

describe("API catch-all route handler", () => {
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

  function upstreamResponse(
    body: unknown,
    status: number,
    headers: Record<string, string> = {},
  ): Response {
    return {
      body: null,
      headers: new Headers(headers),
      json: async () => body,
      status,
    } as unknown as Response;
  }

  beforeEach(() => {
    process.env.API_URL = "https://backend.example.test";
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    delete process.env.API_URL;
  });

  it("forwards the path, query, headers, and body to the backend", async () => {
    fetchMock.mockResolvedValue(
      upstreamResponse({ id: "hw-1" }, 201, {
        "content-type": "application/json",
        "x-request-id": "req-1",
      }),
    );

    const request = new Request("http://frontend.test/api/homework?group=pi-221", {
      method: "POST",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ description: "Read chapter 4" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ["homework"] }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const forwardedRequest = fetchMock.mock.calls[0][0] as Request;
    expect(forwardedRequest).toBeInstanceOf(Request);
    expect(forwardedRequest.url).toBe(
      "https://backend.example.test/homework?group=pi-221",
    );
    expect(forwardedRequest.method).toBe("POST");
    expect(forwardedRequest.headers.get("authorization")).toBe("Bearer token");
    expect(await forwardedRequest.text()).toBe('{"description":"Read chapter 4"}');

    expect(response.status).toBe(201);
    expect(response.headers.get("x-request-id")).toBe("req-1");
    await expect(response.json()).resolves.toEqual({ id: "hw-1" });
  });

  it("forwards GET requests without adding the frontend /api prefix", async () => {
    fetchMock.mockResolvedValue(upstreamResponse("ok", 200));

    await GET(new Request("http://frontend.test/api/health"), {
      params: Promise.resolve({ path: ["health"] }),
    });

    const forwardedRequest = fetchMock.mock.calls[0][0] as Request;
    expect(forwardedRequest.url).toBe("https://backend.example.test/health");
    expect(forwardedRequest.method).toBe("GET");
  });
});
