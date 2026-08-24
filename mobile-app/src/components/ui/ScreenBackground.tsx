import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

// Blurred plant-photo backdrop, rendered once behind the whole navigator
// (see src/app/_layout.tsx) so it shows through every screen and the tab
// bar — same technique as irrigation-dashboard's body::before background,
// same source photo (assets/images/plant-bg.jpg). Individual screens must
// use a transparent (not solid Colors.background) outer container for this
// to show through; the light tint below keeps text legible without that
// needing to be very strong.
// blurRadius shears in transparent pixels at the image's own edges (same
// reason the web CSS version uses transform:scale(1.1)) — overscan the
// image well past the visible bounds so that fringe falls outside the
// screen instead of letting whatever's mounted behind (e.g. a sibling tab
// screen kept alive by the navigator) show through it.
const OVERSCAN = 140;

export function ScreenBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.imageBleed}>
        <Image
          source={require('../../../assets/images/plant-bg.jpg')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={55}
        />
      </View>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background, opacity: 0.12 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  imageBleed: { position: 'absolute', top: -OVERSCAN, left: -OVERSCAN, right: -OVERSCAN, bottom: -OVERSCAN },
});
