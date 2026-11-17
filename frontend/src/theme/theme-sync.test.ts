import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

describe("design tokens", () => {
  it("keeps generated css and ts mirror in sync with @zeta/theme", () => {
    const script = resolve(
      process.cwd(),
      "../packages/theme/scripts/generate.ts",
    );

    try {
      execFileSync(process.execPath, [script, "--check"], {
        encoding: "utf8",
        stdio: "pipe",
      });
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string };
      throw new Error(
        `Generated theme files are stale. Run \`pnpm theme:css\` in frontend/.\n${
          failure.stdout ?? ""
        }${failure.stderr ?? ""}`,
      );
    }
  });
});
