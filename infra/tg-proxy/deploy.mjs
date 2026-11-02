import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function parseEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (val) {
        env[key] = val;
      }
    }
  }
  return env;
}

const envPath = resolve(process.cwd(), ".env");
const envVars = parseEnv(envPath);

const args = ["deploy"];

for (const [key, value] of Object.entries(envVars)) {
  args.push("--var", `${key}:${value}`);
}

if (!envVars.ALLOWED_IP) {
  console.warn("⚠️  Внимание: переменная ALLOWED_IP не задана в .env файле.");
  console.warn("   Прокси будет доступен без ограничения по IP, если ALLOWED_IP не настроен в Cloudflare.");
} else {
  console.log(`🔒 Будет применён разрешённый статический IP: ${envVars.ALLOWED_IP}`);
}

console.log("🚀 Запуск wrangler deploy...");
const result = spawnSync("wrangler", args, { stdio: "inherit", shell: true });

process.exit(result.status ?? 0);
