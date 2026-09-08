import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  status: string;
  tone?: 'success' | 'warning' | 'critical' | 'info' | 'neutral';
}

const TONE_FG: Record<NonNullable<Props['tone']>, string> = {
  success: Colors.primaryDark,
  warning: '#B45309',
  critical: Colors.critical,
  info: Colors.info,
  neutral: Colors.textSecondary,
};

export function MetricCard({ icon: Icon, label, value, status, tone = 'neutral' }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon size={30} color={Colors.primaryDark} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={[styles.status, { color: TONE_FG[tone] }]}>{status}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: '47%', flexGrow: 1, gap: Spacing.xs },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  label: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.semibold },
  value: { fontSize: FontSize.metric, color: Colors.text, fontFamily: FontFamily.bold },
  status: { fontSize: FontSize.caption, fontFamily: FontFamily.semibold },
});
