import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/tg-app", "/invite"];
const SKIP_PREFIXES = ["/api", "/_next"];
const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";
const REFRESH_ENDPOINT = "/auth/refresh";
const CLOCK_SKEW_MS = 30_000;
const REFRESH_TIMEOUT_MS = 5_000;

type JwtPayload = { exp?: number };

type RefreshOutcome =
  | { status: "refreshed"; setCookies: string[] }
  | { status: "rejected" }
  | { status: "unavailable" };

/**
 * Best-effort dedupe of rotations inside one Node process: the backend detects
 * refresh-token reuse and revokes the whole family, so parallel navigations
 * must share a single `POST /auth/refresh`. A short-lived success cache also
 * covers requests that still carry the token we just rotated.
 */
const REFRESH_RESULT_TTL_MS = 10_000;

const refreshInFlight = new Map<string, Promise<RefreshOutcome>>();
const rotatedTokens = new Map<
  string,
  { outcome: RefreshOutcome; expiresAt: number }
>();

function isPublic(pathname: string): boolean {
  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const segment = token.split(".")[1];
  if (!segment) {
    return null;
  }

  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function isExpired(token: string | undefined, now = Date.now()): boolean {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    // Not a readable JWT: the backend stays the source of truth.
    return false;
  }

  return payload.exp * 1000 <= now + CLOCK_SKEW_MS;
}

/**
 * Only real navigations refresh the session here: RSC and prefetch requests
 * would otherwise rotate the same token twice and trip reuse detection.
 */
function isDocumentRequest(request: NextRequest): boolean {
  const destination = request.headers.get("sec-fetch-dest");
  if (destination) {
    return destination === "document";
  }

  return (request.headers.get("accept") ?? "").includes("text/html");
}

function getBackendOrigin(): string | null {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return null;
  }

  try {
    return new URL(apiUrl).origin;
  } catch {
    return null;
  }
}

function readSetCookies(headers: Headers): string[] {
  const getter = (headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;
  return typeof getter === "function" ? getter.call(headers) : [];
}

async function requestRefresh(
  refreshToken: string,
  request: NextRequest,
): Promise<RefreshOutcome> {
  const origin = getBackendOrigin();
  if (!origin) {
    return { status: "unavailable" };
  }

  const userAgent = request.headers.get("user-agent");

  try {
    const response = await fetch(`${origin}${REFRESH_ENDPOINT}`, {
      method: "POST",
      headers: {
        cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}`,
        ...(userAgent ? { "user-agent": userAgent } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      return { status: "rejected" };
    }

    if (!response.ok) {
      return { status: "unavailable" };
    }

    const setCookies = readSetCookies(response.headers);
    if (setCookies.length === 0) {
      return { status: "unavailable" };
    }

    return { status: "refreshed", setCookies };
  } catch {
    return { status: "unavailable" };
  }
}

function refreshSession(
  refreshToken: string,
  request: NextRequest,
): Promise<RefreshOutcome> {
  const now = Date.now();
  for (const [token, entry] of rotatedTokens) {
    if (entry.expiresAt <= now) {
      rotatedTokens.delete(token);
    }
  }

  const rotated = rotatedTokens.get(refreshToken);
  if (rotated) {
    if (rotated.expiresAt > Date.now()) {
      return Promise.resolve(rotated.outcome);
    }
    rotatedTokens.delete(refreshToken);
  }

  const pending = refreshInFlight.get(refreshToken);
  if (pending) {
    return pending;
  }

  const task = requestRefresh(refreshToken, request)
    .then((outcome) => {
      if (outcome.status === "refreshed") {
        rotatedTokens.set(refreshToken, {
          outcome,
          expiresAt: Date.now() + REFRESH_RESULT_TTL_MS,
        });
      }
      return outcome;
    })
    .finally(() => {
      refreshInFlight.delete(refreshToken);
    });
  refreshInFlight.set(refreshToken, task);
  return task;
}

/** Merge rotated cookies into the cookie header handed to the render. */
function withRotatedCookies(
  request: NextRequest,
  setCookies: string[],
): Headers {
  const cookies = new Map<string, string>();
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) {
      cookies.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
    }
  }

  for (const setCookie of setCookies) {
    const pair = setCookie.split(";", 1)[0];
    const index = pair.indexOf("=");
    if (index <= 0) {
      continue;
    }

    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (value) {
      cookies.set(name, value);
    } else {
      cookies.delete(name);
    }
  }

  const headers = new Headers(request.headers);
  headers.set(
    "cookie",
    [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
  );
  return headers;
}

function passThrough(
  request: NextRequest,
  setCookies: string[] = [],
): NextResponse {
  if (setCookies.length === 0) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: withRotatedCookies(request, setCookies) },
  });
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

function redirectToLogin(
  request: NextRequest,
  clearSession = false,
): NextResponse {
  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);
  const nextPath = `${pathname}${search}`;
  if (nextPath !== "/") {
    loginUrl.searchParams.set("next", nextPath);
  }

  const response = NextResponse.redirect(loginUrl);
  if (clearSession) {
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
  }
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!isExpired(accessToken)) {
    return NextResponse.next();
  }

  if (refreshToken) {
    if (!isDocumentRequest(request)) {
      // The client interceptor refreshes after this page's first API call.
      return NextResponse.next();
    }

    const outcome = await refreshSession(refreshToken, request);
    if (outcome.status === "refreshed") {
      return passThrough(request, outcome.setCookies);
    }
    if (outcome.status === "rejected") {
      return redirectToLogin(request, true);
    }
    // Backend unreachable: keep the session and let the client retry later.
    return NextResponse.next();
  }

  return redirectToLogin(request, Boolean(accessToken));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
