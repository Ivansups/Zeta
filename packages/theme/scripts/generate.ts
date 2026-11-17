/**
 * Генерация артефактов темы из tokens.ts.
 *   node scripts/generate.ts          # обновить файлы
 *   node scripts/generate.ts --check  # проверить рассинхрон
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderThemeCss, renderTokensModule } from "../src/css.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const checkOnly = process.argv.includes("--check");

const targets = [
  {
    file: resolve(repoRoot, "frontend/src/app/theme.generated.css"),
    content: renderThemeCss(),
  },
  {
    file: resolve(repoRoot, "frontend/src/theme/tokens.generated.ts"),
    content: renderTokensModule(),
  },
];

let stale = 0;

for (const { file, content } of targets) {
  const label = relative(repoRoot, file);
  const current = existsSync(file) ? readFileSync(file, "utf8") : null;

  if (current === content) {
    console.log(`ok       ${label}`);
    continue;
  }

  if (checkOnly) {
    console.error(`устарел  ${label}`);
    stale += 1;
    continue;
  }

  writeFileSync(file, content);
  console.log(`обновлён ${label}`);
}

if (stale > 0) {
  console.error(
    "\nСгенерированные файлы расходятся с packages/theme/src/tokens.ts." +
      "\nВыполните `pnpm theme:css` из frontend/.",
  );
  process.exit(1);
}
