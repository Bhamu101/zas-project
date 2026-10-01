/**
 * Agri-Intelligence design tokens.
 * Plain StyleSheet + tokens (no NativeWind) — Expo SDK 57 ships React Compiler +
 * RN 0.86 and is too new to safely layer a Babel-based styling toolchain on top of
 * right now, so the design system lives here instead.
 *
 * Palette: near-black + neon lime brand accent, on white cards, per a supplied
 * reference. IMPORTANT: `primary` (the lime) is bright enough that it fails
 * contrast as small text/icon color on white — use it only for FILLS (button
 * backgrounds, active-state chips/tabs, progress rings, chart lines/bars) and
 * for text/icons on genuinely dark backgrounds. Anywhere brand color is needed
 * as legible text/icon color on a light surface, use `primaryDark` (near-black)
 * instead — never bare `primary` for that. `success`/`warning`/`critical`/`info`
 * are intentionally independent of `primary` (not aliased to it) so status
 * semantics (e.g. "optimal"/"healthy") stay legible regardless of brand color.
 */
import { Platform } from 'react-native';

export const Colors = {
  // Brand
  primary: '#C7FF2E', // neon lime — fills only: buttons, active chips/tabs, progress rings/bars
  primaryDark: '#0F0F0F', // near-black — brand-accent TEXT/ICON on light surfaces (lime fails contrast there)
  primaryLight: '#F2FFDC', // light lime tint — chip/badge backgrounds
  deep: '#0F0F0F', // near-black — splash/hero dark backgrounds

  // Neutrals (60% of the UI)
  background: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E2E2E2',

  // Text
  text: '#0F0F0F', // near-black — primary text
  textSecondary: '#808080', // mid grey — secondary info
  textMuted: '#A6A6A6',
  textOnPrimary: '#FFFFFF',

  // Status — deliberately independent of `primary` (see note above)
  warning: '#F59E0B',
  warningLight: '#FFF6E5',
  critical: '#E53935',
  criticalLight: '#FDECEC',
  info: '#2E6BE6',
  infoLight: '#EAF1FE',
  success: '#3FA34D',
  successLight: '#E6F4E1',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  // Bottom padding for scroll views. Was 140 when the tab bar floated over
  // content; the bar is now anchored and takes its own layout space, so this is
  // just ordinary breathing room. The name is kept so 14 call sites don't churn.
  huge: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

// Plus Jakarta Sans — single versatile family, premium/modern/friendly, large
// readable numerals. Loaded via @expo-google-fonts/plus-jakarta-sans (see
// src/app/_layout.tsx); falls back to system font until loaded.
export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  // High-contrast Didone display serif — used for the splash wordmark (a free
  // stand-in for Marqen Serif). Reserve for large display text; it's not a
  // body face.
  serif: 'PlayfairDisplay_700Bold',
} as const;

export const FontSize = {
  caption: 12,
  body: 14,
  subtitle: 16,
  heading: 20,
  metric: 28,
  metricLarge: 34,
} as const;

export const FontWeight = {
  regular: '400',
  semibold: '600',
  bold: '700',
} as const;

export const Shadow = Platform.select({
  ios: {
    shadowColor: '#0F0F0F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  android: { elevation: 3 },
  default: {},
}) as object;

export const Touch = {
  minSize: 44,
};
