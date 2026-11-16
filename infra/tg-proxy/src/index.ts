export interface Env {
  TELEGRAM_API_BASE?: string;
  PROXY_SECRET?: string;
  ALLOWED_IP?: string; // Единственный статический IP продакшн-сервера (например, "185.123.45.67")
  ALLOWED_IPS?: string; // Либо несколько IP через запятую
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Получаем реальный IP клиента от Cloudflare
    const clientIp = request.headers.get("cf-connecting-ip") || "";

    // Формируем список разрешённых IP из ALLOWED_IP и ALLOWED_IPS
    const rawAllowed = [env.ALLOWED_IP, env.ALLOWED_IPS].filter(Boolean).join(",");
    if (rawAllowed) {
      const allowedList = rawAllowed
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean);

      // В локальной разработке cf-connecting-ip может отсутствовать или быть localhost
      const isLocalhost =
        !clientIp || clientIp === "127.0.0.1" || clientIp === "::1";

      if (!allowedList.includes(clientIp) && !isLocalhost) {
        return new Response(
          JSON.stringify({
            ok: false,
            error_code: 403,
            description: `Forbidden: incoming IP '${clientIp || "unknown"}' is not authorized. Access is restricted to the configured production IP.`,
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Healthcheck эндпоинт для проверки статуса и определения своего IP
    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "zeta-tg-proxy",
          client_ip: clientIp || "unknown",
          ip_protection_enabled: Boolean(rawAllowed),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Proxy-Secret",
        },
      });
    }

    // Дополнительная защита секретным ключом (если задан)
    if (env.PROXY_SECRET) {
      const secretHeader = request.headers.get("X-Proxy-Secret");
      const secretQuery = url.searchParams.get("proxy_secret");
      if (secretHeader !== env.PROXY_SECRET && secretQuery !== env.PROXY_SECRET) {
        return new Response(
          JSON.stringify({
            ok: false,
            error_code: 403,
            description: "Forbidden: invalid proxy secret",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Удаляем служебный параметр proxy_secret из URL перед отправкой в Telegram
    url.searchParams.delete("proxy_secret");

    // Формируем целевой URL к api.telegram.org
    const apiBase = env.TELEGRAM_API_BASE || "https://api.telegram.org";
    const targetUrl = new URL(url.pathname + url.search, apiBase);

    // Клонируем и очищаем заголовки
    const newHeaders = new Headers(request.headers);
    newHeaders.delete("X-Proxy-Secret");
    newHeaders.delete("cf-connecting-ip");
    newHeaders.delete("cf-ipcountry");
    newHeaders.delete("cf-ray");
    newHeaders.delete("cf-visitor");
    newHeaders.set("Host", targetUrl.host);

    try {
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
        redirect: "follow",
      });

      // Пробрасываем ответ обратно боту
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return new Response(
        JSON.stringify({
          ok: false,
          error_code: 502,
          description: `Bad Gateway: ${errorMessage}`,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
