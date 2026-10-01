import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

// The real Agri-Intelligence plant/circuit logo (was a placeholder SVG until
// the asset was supplied). `agri-logo-mark.png` is the tree with its original
// black backdrop removed, so it sits on any surface — the chip below supplies
// the background, not the image.
export function LogoMark({ size = 48, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  return (
    <View
      style={[
        styles.chip,
        {
          width: size,
          height: size,
          borderRadius: Radius.lg,
          backgroundColor: tone === 'light' ? Colors.primaryLight : 'rgba(255,255,255,0.15)',
        },
      ]}>
      <Image
        source={require('@/assets/images/agri-logo-mark.png')}
        style={{ width: size * 0.68, height: size * 0.68 }}
        contentFit="contain"
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
