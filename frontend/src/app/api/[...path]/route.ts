type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const ORIGIN_HEADERS = ["connection", "content-length", "host", "transfer-encoding"];
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

function getBackendOrigin(): string {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error("API_URL must be configured for the API proxy");
  }

  return new URL(apiUrl).origin;
}

async function proxyRequest(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const incomingUrl = new URL(request.url);
  const pathname = path.map((segment) => encodeURIComponent(segment)).join("/");
  const targetUrl = new URL(`/${pathname}${incomingUrl.search}`, `${getBackendOrigin()}/`);

  const method = request.method;
  const headers = new Headers(request.headers);
  for (const header of ORIGIN_HEADERS) {
    headers.delete(header);
  }

  // Buffer the body explicitly: cloning an incoming request with an empty
  // stream fails on some Node versions ("expected non-null body source").
  const buffer = BODYLESS_METHODS.has(method) ? undefined : await request.arrayBuffer();
  const forwardedRequest = new Request(targetUrl, {
    method,
    headers,
    body: buffer && buffer.byteLength > 0 ? buffer : undefined,
    redirect: "manual",
  });

  return fetch(forwardedRequest);
}

export function GET(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export function HEAD(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export function POST(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export function PUT(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export function OPTIONS(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}
