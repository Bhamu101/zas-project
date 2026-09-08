import { useEffect, useState } from 'react';
import { Animated, type DimensionValue } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

// Pulsing placeholder block for skeleton loading states — plain core
// react-native Animated (opacity loop), no extra dependency needed.
export function Skeleton({
  width,
  height,
  radius = Radius.md,
  style,
}: {
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: object;
}) {
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: Colors.border, opacity }, style]}
    />
  );
}
