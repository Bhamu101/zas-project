import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors, FontFamily, FontSize } from '@/constants/theme';

interface Props {
  percent: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  valueSuffix?: string;
}

export function CircularProgress({
  percent,
  size = 96,
  strokeWidth = 10,
  color = Colors.primary,
  trackColor = Colors.primaryLight,
  label,
  valueSuffix = '%',
}: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Text style={[styles.value, { fontSize: size * 0.24 }]}>
            {Math.round(clamped)}
            <Text style={styles.suffix}>{valueSuffix}</Text>
          </Text>
          {label && <Text style={styles.label}>{label}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: FontFamily.bold, color: Colors.text },
  suffix: { fontSize: FontSize.body, fontFamily: FontFamily.semibold, color: Colors.textSecondary },
  label: { fontSize: FontSize.caption, fontFamily: FontFamily.medium, color: Colors.textSecondary, marginTop: 2 },
});
