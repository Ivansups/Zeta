type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const ORIGIN_HEADERS = ["connection", "content-length", "host", "transfer-encoding"];

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
  const forwardedRequest = new Request(targetUrl, request);

  for (const header of ORIGIN_HEADERS) {
    forwardedRequest.headers.delete(header);
  }

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
