/**
 * Agri-Intelligence design tokens.
 * Plain StyleSheet + tokens (no NativeWind) — Expo SDK 57 ships React Compiler +
 * RN 0.86 and is too new to safely layer a Babel-based styling toolchain on top of
 * right now, so the design system lives here instead.
 *
 * Palette direction: deep agricultural green for nav/important text, a bright
 * fresh lime-green reserved for primary actions and active states only, white
 * cards on an off-white/light-green background, charcoal body text, muted grey
 * for secondary text, and red/orange used only for warnings.
 */
import { Platform } from 'react-native';

export const Colors = {
  // Brand
  primary: '#3FA34D', // bright fresh green — CTAs, active states, progress fills only
  primaryDark: '#2E7D3A', // pressed state for primary
  primaryLight: '#E6F4E1', // light green tint — chips, subtle section backgrounds
  deep: '#173A2E', // deep agricultural green — nav/header text, splash background

  // Neutrals (60% of the UI)
  background: '#F7FAF5',
  surface: '#FFFFFF',
  border: '#E7ECE4',

  // Text
  text: '#20261F', // dark charcoal (green-tinted) — primary text
  textSecondary: '#6B7280', // muted grey — secondary info
  textMuted: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Status — used sparingly, only for warnings/abnormal readings
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
  huge: 64,
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
    shadowColor: '#173A2E',
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
