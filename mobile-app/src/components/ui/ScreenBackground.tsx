import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

// Flat page background from the palette (no photo) — rendered once behind
// the whole navigator (see src/app/_layout.tsx) so it shows through every
// screen and the tab bar. Individual screens must use a transparent (not
// solid Colors.background) outer container for this to show through.
export function ScreenBackground() {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} pointerEvents="none" />;
}
