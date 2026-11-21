/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

function makeRequest(path: string, accessToken?: string): NextRequest {
  const request = new NextRequest(new URL(`http://localhost${path}`));
  if (accessToken) {
    request.cookies.set("access_token", accessToken);
  }
  return request;
}

describe("proxy", () => {
  it("redirects to /login when there is no access token", () => {
    const response = proxy(makeRequest("/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("keeps the requested page in the next parameter", () => {
    const response = proxy(makeRequest("/admin"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fadmin",
    );
  });

  it("passes protected pages through when the access token is present", () => {
    const response = proxy(makeRequest("/admin", "jwt"));

    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["/login", "/tg-app"])("keeps %s public", (path) => {
    const response = proxy(makeRequest(path));

    expect(response.headers.get("location")).toBeNull();
  });

  it("never blocks the API proxy route", () => {
    const response = proxy(makeRequest("/api/auth/me"));

    expect(response.headers.get("location")).toBeNull();
  });
});
