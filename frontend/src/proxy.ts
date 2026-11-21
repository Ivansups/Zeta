import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/tg-app"];
const SKIP_PREFIXES = ["/api", "/_next"];

function isPublic(pathname: string): boolean {
  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Optimistic auth check: pages require a session cookie (access or refresh).
 * Token validity is still verified by the backend on every API call.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // A valid refresh cookie means the session is recoverable client-side.
  const hasSession = Boolean(
    request.cookies.get("access_token")?.value ||
      request.cookies.get("refresh_token")?.value,
  );

  if (isPublic(pathname) || hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
