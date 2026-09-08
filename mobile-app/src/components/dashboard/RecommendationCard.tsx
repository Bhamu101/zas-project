import { CheckCircle2, Droplets, Lightbulb } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Recommendation } from '@/types';

const SEVERITY_META: Record<Recommendation['severity'], { icon: typeof Droplets; tone: string; priority: string }> = {
  urgent: { icon: Droplets, tone: Colors.critical, priority: 'Important' },
  suggested: { icon: Droplets, tone: '#B45309', priority: 'Recommended' },
  none: { icon: CheckCircle2, tone: Colors.primaryDark, priority: 'Good' },
};

export function RecommendationCard({
  recommendation,
  onStartNow,
  starting,
}: {
  recommendation: Recommendation;
  onStartNow?: () => void;
  starting?: boolean;
}) {
  const meta = SEVERITY_META[recommendation.severity];
  const Icon = meta.icon;

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Icon size={26} color={meta.tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headline, { color: meta.tone }]}>{recommendation.headline}</Text>
          <Text style={styles.bedName}>{recommendation.bedName}</Text>
        </View>
        <Text style={[styles.priorityText, { color: meta.tone }]}>{meta.priority}</Text>
      </View>

      <Text style={styles.message}>{recommendation.message}</Text>

      {recommendation.reasons.length > 0 && (
        <View style={styles.reasonsBox}>
          <Text style={styles.reasonsTitle}>Why this advice?</Text>
          {recommendation.reasons.map((r) => (
            <View key={r.label} style={styles.reasonRow}>
              <Text style={styles.reasonLabel}>{r.label}</Text>
              <Text style={styles.reasonValue}>{r.value}</Text>
            </View>
          ))}
        </View>
      )}

      {recommendation.severity !== 'none' && onStartNow && (
        <PrimaryButton title={`Start Now (${recommendation.suggestedDurationMin} min)`} onPress={onStartNow} loading={starting} />
      )}

      <View style={styles.tipRow}>
        <Lightbulb size={14} color={Colors.textMuted} />
        <Text style={styles.tipText}>{recommendation.tip}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  priorityText: { fontSize: FontSize.caption, fontFamily: FontFamily.bold },
  headline: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold },
  bedName: { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 2 },
  message: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 20 },
  reasonsBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  reasonsTitle: { fontSize: FontSize.caption, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: Spacing.xs },
  reasonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reasonLabel: { fontSize: FontSize.caption, color: Colors.textSecondary },
  reasonValue: { fontSize: FontSize.caption, fontFamily: FontFamily.semibold, color: Colors.text },
  tipRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: FontSize.caption, color: Colors.textMuted, fontStyle: 'italic' },
});
