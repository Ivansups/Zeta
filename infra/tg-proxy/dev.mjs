import { copyFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
const devVarsPath = resolve(process.cwd(), ".dev.vars");

if (existsSync(envPath)) {
  copyFileSync(envPath, devVarsPath);
}

const result = spawnSync("wrangler", ["dev"], { stdio: "inherit", shell: true });
process.exit(result.status ?? 0);
