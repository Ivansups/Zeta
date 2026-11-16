export interface ThemeColors {
  readonly background: string;
  readonly surface: string;
  readonly surfaceMuted: string;
  readonly surfaceRaised: string;
  readonly surfaceHover: string;

  readonly foreground: string;
  readonly foregroundMuted: string;
  readonly muted: string;
  readonly mutedSoft: string;

  readonly border: string;
  readonly borderSoft: string;

  readonly primary: string;
  readonly primaryHover: string;
  readonly primarySoft: string;
  readonly primaryBorder: string;

  readonly accentBlue: string;
  readonly accentBlueSoft: string;
  readonly accentBlueBorder: string;

  readonly accentGreen: string;
  readonly accentGreenSoft: string;
  readonly accentGreenBorder: string;

  readonly accentAmber: string;
  readonly accentAmberSoft: string;
  readonly accentAmberBorder: string;

  readonly accentViolet: string;
  readonly accentVioletSoft: string;
  readonly accentVioletBorder: string;

  readonly accentCoral: string;
  readonly accentCoralSoft: string;
  readonly accentCoralBorder: string;

  readonly danger: string;
  readonly dangerSoft: string;
  readonly dangerBorder: string;
}

export interface ThemeTokens {
  readonly light: ThemeColors;
  readonly dark: ThemeColors;
  readonly radii: {
    readonly xs: string;
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
    readonly xl: string;
    readonly full: string;
  };
  readonly spacing: {
    readonly xs: string;
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
    readonly xl: string;
    readonly "2xl": string;
  };
  readonly shadows: {
    readonly xs: string;
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
  };
  readonly transitions: {
    readonly easeSpring: string;
    readonly easeBounce: string;
    readonly durationFast: string;
    readonly durationNormal: string;
    readonly durationEnter: string;
  };
}

export const lightColors: ThemeColors = {
  background: "#f8f9fa",
  surface: "#ffffff",
  surfaceMuted: "#f1f3f5",
  surfaceRaised: "#ffffff",
  surfaceHover: "#f4f6f8",

  foreground: "#0f1115",
  foregroundMuted: "#2c3038",
  muted: "#606773",
  mutedSoft: "#858d9b",

  border: "#e2e4e8",
  borderSoft: "#eceef1",

  primary: "#1d4ed8",
  primaryHover: "#1e40af",
  primarySoft: "#eff4fe",
  primaryBorder: "#bfdbfe",

  accentBlue: "#1d4ed8",
  accentBlueSoft: "#eff4fe",
  accentBlueBorder: "#dbeafe",

  accentGreen: "#047857",
  accentGreenSoft: "#ecfdf5",
  accentGreenBorder: "#a7f3d0",

  accentAmber: "#b45309",
  accentAmberSoft: "#fffbeb",
  accentAmberBorder: "#fde68a",

  accentViolet: "#6d28d9",
  accentVioletSoft: "#f5f3ff",
  accentVioletBorder: "#ddd6fe",

  accentCoral: "#be123c",
  accentCoralSoft: "#fff1f2",
  accentCoralBorder: "#fecdd3",

  danger: "#b91c1c",
  dangerSoft: "#fef2f2",
  dangerBorder: "#fecaca",
} as const;

export const darkColors: ThemeColors = {
  background: "#0c0d10",
  surface: "#13151a",
  surfaceMuted: "#1a1d24",
  surfaceRaised: "#171920",
  surfaceHover: "#1f222b",

  foreground: "#f3f4f6",
  foregroundMuted: "#d1d5db",
  muted: "#8b92a0",
  mutedSoft: "#636a78",

  border: "#232731",
  borderSoft: "#1a1d24",

  primary: "#3b82f6",
  primaryHover: "#60a5fa",
  primarySoft: "#132238",
  primaryBorder: "#1e3a5f",

  accentBlue: "#60a5fa",
  accentBlueSoft: "#132238",
  accentBlueBorder: "#1e3a5f",

  accentGreen: "#34d399",
  accentGreenSoft: "#0e2a20",
  accentGreenBorder: "#154d38",

  accentAmber: "#fbbf24",
  accentAmberSoft: "#2e230d",
  accentAmberBorder: "#4d3a12",

  accentViolet: "#a78bfa",
  accentVioletSoft: "#221c38",
  accentVioletBorder: "#3b2d60",

  accentCoral: "#fb7185",
  accentCoralSoft: "#2e141a",
  accentCoralBorder: "#4f1d27",

  danger: "#f87171",
  dangerSoft: "#2e1416",
  dangerBorder: "#521c20",
} as const;

export const radii = {
  xs: "4px",
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
} as const;

export const shadows = {
  xs: "0 1px 2px rgb(15 17 21 / 4%)",
  sm: "0 2px 4px rgb(15 17 21 / 5%), 0 6px 16px rgb(15 17 21 / 4%)",
  md: "0 6px 12px -2px rgb(15 17 21 / 8%), 0 16px 32px -4px rgb(15 17 21 / 8%)",
  lg: "0 20px 48px -12px rgb(15 17 21 / 14%)",
} as const;

export const transitions = {
  easeSpring: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeBounce: "cubic-bezier(0.34, 1.4, 0.64, 1)",
  durationFast: "140ms",
  durationNormal: "200ms",
  durationEnter: "260ms",
} as const;

export const zetaTheme: ThemeTokens = {
  light: lightColors,
  dark: darkColors,
  radii,
  spacing,
  shadows,
  transitions,
} as const;

export default zetaTheme;
