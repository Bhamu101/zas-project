import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors, Radius } from '@/constants/theme';

// TEMPORARY placeholder for the supplied Agri-Intelligence plant/circuit logo.
// Swap this for the real asset: drop the file at
// mobile-app/assets/images/agri-logo.png and replace the <Svg> block below
// with:
//   <Image source={require('@/assets/images/agri-logo.png')} style={{ width: size, height: size }} contentFit="contain" />
// Keep the surrounding chip/props the same so every call site is unchanged.
export function LogoMark({ size = 48, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const leaf = tone === 'light' ? Colors.primary : Colors.textOnPrimary;
  const node = tone === 'light' ? Colors.deep : Colors.primary;

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
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 21c0-5 3-8 7-9-1 5-3 9-7 9Z"
          fill={leaf}
        />
        <Path
          d="M12 21c0-6-3.5-9.5-8-10.5C5.2 15 8 20 12 21Z"
          fill={leaf}
          opacity={0.7}
        />
        <Path d="M12 21V9" stroke={node} strokeWidth={1.4} strokeLinecap="round" />
        <Circle cx="12" cy="8" r="1.6" fill={node} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
