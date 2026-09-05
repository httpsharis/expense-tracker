// src/shared/theme/tokens.ts

/**
 * Gold is a state signal, not a decorative color — it means "money is
 * owed to you and still open." It never changes with theme and never
 * gets reused for anything else (selection, links, progress).
 */
export const GOLD = '#C9A24B';
export const GOLD_DIM = 'rgba(201,162,75,0.14)';

export interface ThemeTokens {
  // Screen-level backgrounds
  bgCanvas: string;
  bgBase: string;

  // Flat surfaces — resting cards, rows, inputs
  surfaceFlat: string;
  surfaceFlatBorder: string;

  // Raised surfaces — buttons, elevated cards
  surfaceRaised: string;
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

  gold: string;
  goldDim: string;
}

const dark: ThemeTokens = {
  bgCanvas: '#000000',
  bgBase: '#0A0A0B',

  surfaceFlat: '#141416',
  surfaceFlatBorder: 'rgba(255,255,255,0.08)',

  surfaceRaised: '#18181B',
  shadowColor: '#000000',

  overlayTint: 'rgba(10,10,11,0.72)',
  blurIntensity: 40,

  textPrimary: '#F5F5F3',
  textSecondary: '#9C9C9F',
  textTertiary: '#5E5E61',

  divider: 'rgba(255,255,255,0.08)',

  btnFill: '#F2F2F0',
  btnText: '#0A0A0B',

  gold: GOLD,
  goldDim: GOLD_DIM,
};

const light: ThemeTokens = {
  bgCanvas: '#FFFFFF',
  bgBase: '#F7F7F5',

  surfaceFlat: '#FFFFFF',
  surfaceFlatBorder: 'rgba(10,10,11,0.10)',

  surfaceRaised: '#FFFFFF',
  shadowColor: '#0A0A0B',

  overlayTint: 'rgba(255,255,255,0.72)',
  blurIntensity: 30,

  textPrimary: '#0A0A0B',
  textSecondary: '#6B6B6E',
  textTertiary: '#A0A0A3',

  divider: 'rgba(10,10,11,0.08)',

  btnFill: '#0A0A0B',
  btnText: '#F5F5F3',

  gold: GOLD,
  goldDim: GOLD_DIM,
};

export const themes = { light, dark } as const;
export type ThemeName = keyof typeof themes;

export const radii = {
  screen: 22,
  card: 14,
  input: 10,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;