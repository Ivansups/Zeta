/**
 * Канонические дизайн-токены Zeta: цвета — hex, размеры — числа без единиц,
 * чтобы одни значения подходили и для CSS, и для React Native.
 */

export interface ThemePalette {
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

/** RN берёт числа напрямую, веб получает CSS-строку через css.ts. */
export interface ShadowLayer {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread?: number;
  /** RGB-канал без альфы, например [15, 17, 21]. */
  readonly rgb: readonly [number, number, number];
  /** Альфа в процентах, как в CSS: 4 → 4%. */
  readonly opacity: number;
}

export interface ShadowScale {
  readonly xs: readonly ShadowLayer[];
  readonly sm: readonly ShadowLayer[];
  readonly md: readonly ShadowLayer[];
  readonly lg: readonly ShadowLayer[];
}

export const lightPalette: ThemePalette = {
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
};

export const darkPalette: ThemePalette = {
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
};

export const lightShadows: ShadowScale = {
  xs: [{ x: 0, y: 1, blur: 2, rgb: [15, 17, 21], opacity: 4 }],
  sm: [
    { x: 0, y: 2, blur: 4, rgb: [15, 17, 21], opacity: 5 },
    { x: 0, y: 6, blur: 16, rgb: [15, 17, 21], opacity: 4 },
  ],
  md: [
    { x: 0, y: 6, blur: 12, spread: -2, rgb: [15, 17, 21], opacity: 8 },
    { x: 0, y: 16, blur: 32, spread: -4, rgb: [15, 17, 21], opacity: 8 },
  ],
  lg: [{ x: 0, y: 20, blur: 48, spread: -12, rgb: [15, 17, 21], opacity: 14 }],
};

export const darkShadows: ShadowScale = {
  xs: [{ x: 0, y: 1, blur: 2, rgb: [0, 0, 0], opacity: 20 }],
  sm: [
    { x: 0, y: 2, blur: 6, rgb: [0, 0, 0], opacity: 30 },
    { x: 0, y: 8, blur: 24, rgb: [0, 0, 0], opacity: 25 },
  ],
  md: [
    { x: 0, y: 6, blur: 14, rgb: [0, 0, 0], opacity: 35 },
    { x: 0, y: 20, blur: 36, rgb: [0, 0, 0], opacity: 30 },
  ],
  lg: [{ x: 0, y: 24, blur: 56, rgb: [0, 0, 0], opacity: 50 }],
};

/** Числа: RN принимает их напрямую, CSS — через `radiusPx`. */
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
} as const;

/** Длительности в мс, кривые — контрольные точки Безье. */
export const motion = {
  duration: {
    fast: 140,
    normal: 200,
    enter: 260,
  },
  easing: {
    spring: [0.16, 1, 0.3, 1],
    bounce: [0.34, 1.4, 0.64, 1],
  },
} as const;
