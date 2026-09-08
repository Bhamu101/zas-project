import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

// Every section is an outlined box — a full lime (brand) border segments it from
// the page and from adjacent sections. No fill / shadow / blur; the page
// background shows through. Callers may still pass a `backgroundColor` in
// `style` (e.g. the highlighted "your crop" row) — it sits inside the border.
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: Spacing.lg,
  },
});
