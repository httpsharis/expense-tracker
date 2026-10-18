// src/shared/theme/tokens.ts

/**
 * Gold is a state signal, not a decorative color — it means "money is
 * owed to you and still open." It never changes with theme and never
 * gets reused for anything else (selection, links, progress).
 */
export const GOLD = '#C9A24B';
export const GOLD_DIM = 'rgba(201,162,75,0.14)';

/**
 * Primary Brand & Accent Tokens
 */
export const PRIMARY = '#22C55E';
export const LIME = '#22C55E';
export const EMERALD = '#16A34A';
export const CORAL = '#EF4444';
export const CANVAS_LIGHT = '#F7F7F5';
export const SURFACE_TINT_LIGHT = '#F4F4F5';
export const BORDER_LIGHT = '#E4E4E7';

export interface ThemeTokens {
  // Screen-level backgrounds
  bgCanvas: string;
  bgBase: string;

  // Flat surfaces — resting cards, rows, inputs
  surfaceFlat: string;
  surfaceFlatBorder: string;

  // Raised surfaces — buttons, elevated cards
  surfaceRaised: string;
  surfaceTint?: string;
  shadowColor: string;

  // Overlay surfaces — blurred, floats over other content
  overlayTint: string;
  blurIntensity: number;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  divider: string;

  // Primary CTA
  btnFill: string;
  btnText: string;

  // Accents & Signals
  gold: string;
  goldDim: string;
  primary?: string;
  lime?: string;
  emerald?: string;
  coral?: string;
}

const dark: ThemeTokens = {
  bgCanvas: '#0A0A0B',
  bgBase: '#0A0A0B',

  surfaceFlat: '#141416',
  surfaceFlatBorder: 'rgba(255,255,255,0.08)',

  surfaceRaised: '#18181B',
  surfaceTint: '#1F1F23',
  shadowColor: '#000000',

  overlayTint: 'rgba(10,10,11,0.72)',
  blurIntensity: 40,

  textPrimary: '#F5F5F3',
  textSecondary: '#9C9C9F',
  textTertiary: '#5E5E61',

  divider: 'rgba(255,255,255,0.08)',

  btnFill: '#22C55E',
  btnText: '#0A0A0B',

  gold: GOLD,
  goldDim: GOLD_DIM,
  primary: PRIMARY,
  lime: LIME,
  emerald: EMERALD,
  coral: CORAL,
};

const light: ThemeTokens = {
  bgCanvas: '#F7F7F5',
  bgBase: '#FFFFFF',

  surfaceFlat: '#FFFFFF',
  surfaceFlatBorder: '#E4E4E7',

  surfaceRaised: '#FFFFFF',
  surfaceTint: '#F4F4F5',
  shadowColor: '#0A0A0B',

  overlayTint: 'rgba(255,255,255,0.72)',
  blurIntensity: 30,

  textPrimary: '#0A0A0B',
  textSecondary: '#6B6B6E',
  textTertiary: '#A0A0A3',

  divider: 'rgba(10,10,11,0.08)',

  btnFill: '#22C55E',
  btnText: '#FFFFFF',

  gold: GOLD,
  goldDim: GOLD_DIM,
  primary: PRIMARY,
  lime: LIME,
  emerald: EMERALD,
  coral: CORAL,
};

export const themes = { light, dark } as const;
export type ThemeName = keyof typeof themes;

export const radii = {
  screen: 32,
  card: 28,
  cardSm: 24,
  button: 18,
  input: 16,
  pill: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;