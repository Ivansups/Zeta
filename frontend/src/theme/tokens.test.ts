import { darkColors, lightColors, radii, shadows, spacing, transitions, zetaTheme } from "./tokens";

describe("zetaTheme design tokens", () => {
  it("exports correct light and dark theme colors", () => {
    expect(zetaTheme.light).toBeDefined();
    expect(zetaTheme.dark).toBeDefined();

    expect(zetaTheme.light.background).toBe("#f8f9fa");
    expect(zetaTheme.light.primary).toBe("#1d4ed8");
    expect(zetaTheme.light.surface).toBe("#ffffff");

    expect(zetaTheme.dark.background).toBe("#0c0d10");
    expect(zetaTheme.dark.primary).toBe("#3b82f6");
    expect(zetaTheme.dark.surface).toBe("#13151a");
  });

  it("exports consistent nested radii scale", () => {
    expect(radii.xs).toBe("4px");
    expect(radii.sm).toBe("6px");
    expect(radii.md).toBe("8px");
    expect(radii.lg).toBe("12px");
    expect(radii.xl).toBe("16px");
    expect(radii.full).toBe("9999px");
  });

  it("exports matching token keys in light and dark palettes", () => {
    const lightKeys = Object.keys(lightColors).sort();
    const darkKeys = Object.keys(darkColors).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it("exports spacing, shadows and transitions", () => {
    expect(spacing.md).toBe("12px");
    expect(shadows.sm).toContain("0 2px 4px");
    expect(transitions.durationNormal).toBe("200ms");
  });
});
