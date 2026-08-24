import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

interface Props {
  labels: string[];
  values: number[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function SimpleBarChart({ labels, values, color = Colors.primary, height = 120, formatValue }: Props) {
  const max = Math.max(...values, 1);

  return (
    <View style={[styles.row, { height }]}>
      {values.map((v, i) => (
        <View key={labels[i] + i} style={styles.barColumn}>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: `${Math.max(4, (v / max) * 100)}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.label}>{labels[i]}</Text>
          {formatValue && <Text style={styles.value}>{formatValue(v)}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  barColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: Radius.sm, minHeight: 4 },
  label: { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: Spacing.xs },
  value: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.semibold },
});
