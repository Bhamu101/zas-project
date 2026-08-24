import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

export type BadgeTone = 'success' | 'warning' | 'critical' | 'info' | 'neutral';

const TONE_COLORS: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: Colors.successLight, fg: Colors.primary },
  warning: { bg: Colors.warningLight, fg: '#B45309' },
  critical: { bg: Colors.criticalLight, fg: Colors.critical },
  info: { bg: Colors.infoLight, fg: Colors.info },
  neutral: { bg: Colors.background, fg: Colors.textSecondary },
};

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const c = TONE_COLORS[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text style={[styles.label, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold },
});
