import { router } from 'expo-router';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Droplet,
  Droplets,
  Eye,
  MapPin,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { type BadgeTone } from '@/components/ui/StatusBadge';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useFarmStore } from '@/store/farmStore';
import type { Bed, SystemInfo } from '@/types';

// Mirrors irrigation-dashboard/src/pages/BedMonitoring.jsx's BedCard exactly
// (same colors, copy, and range-bar layout) so the mobile Crops list reads as
// the same feature as the web dashboard's Bed Monitoring page.

interface StateStyle {
  hex: string;
  label: string;
  icon: LucideIcon;
  message: string;
  actionLabel: string;
  actionIcon: LucideIcon;
  filled: boolean;
}

const STATE_STYLE: Record<Bed['state'], StateStyle> = {
  critical: {
    hex: Colors.critical,
    label: 'Critical',
    icon: AlertTriangle,
    message: 'Moisture below trigger threshold',
    actionLabel: 'Start Irrigation',
    actionIcon: Droplet,
    filled: true,
  },
  'needs-water': {
    hex: '#f59e0b',
    label: 'Needs Water',
    icon: AlertTriangle,
    message: 'Moisture below optimal range',
    actionLabel: 'Monitor',
    actionIcon: Eye,
    filled: false,
  },
  optimal: {
    hex: Colors.success,
    label: 'Optimal',
    icon: CheckCircle2,
    message: 'Moisture within optimal range',
    actionLabel: 'No Action Required',
    actionIcon: Check,
    filled: false,
  },
};

export function bedStateTone(state: Bed['state']): BadgeTone {
  if (state === 'optimal') return 'success';
  if (state === 'needs-water') return 'warning';
  return 'critical';
}

export function bedStateLabel(state: Bed['state']): string {
  return STATE_STYLE[state].label;
}

// Derived, not fabricated: a 0-100 health proxy from the bed's real VWC
// reading relative to its real optimal band (systemInfo), so it moves with
// actual sensor data instead of being invented per-crop metadata.
export function healthPct(bed: Bed, systemInfo: SystemInfo): number {
  return Math.max(5, Math.min(100, Math.round((bed.vwc / systemInfo.vwcOptimalMax) * 100)));
}

function RangeBar({
  vwc,
  trigger,
  optMin,
  optMax,
  color,
}: {
  vwc: number;
  trigger: number;
  optMin: number;
  optMax: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, vwc));

  return (
    <View style={styles.rangeWrap}>
      <View style={[styles.pin, { left: `${clamped}%` }]}>
        <MapPin size={18} color={color} fill={Colors.surface} strokeWidth={2} />
      </View>
      <View style={styles.barTrack}>
        <View style={{ width: `${trigger}%`, backgroundColor: Colors.critical }} />
        <View style={{ width: `${Math.max(0, optMin - trigger)}%`, backgroundColor: '#f59e0b' }} />
        <View style={{ width: `${Math.max(0, optMax - optMin)}%`, backgroundColor: Colors.success }} />
        <View style={{ width: `${Math.max(0, 100 - optMax)}%`, backgroundColor: Colors.border }} />
      </View>
      <View style={styles.barEndsRow}>
        <Text style={styles.barEndText}>0%</Text>
        <Text style={styles.barEndText}>100%</Text>
      </View>
      <View style={styles.barTicksRow}>
        {[trigger, optMin, optMax].map((t) => (
          <Text key={t} style={[styles.barTick, { left: `${t}%` }]}>
            {t}%
          </Text>
        ))}
      </View>
    </View>
  );
}

export function CropCard({ bed }: { bed: Bed }) {
  const setSelectedBedId = useFarmStore((s) => s.setSelectedBedId);
  const s = STATE_STYLE[bed.state];
  const Icon = s.icon;
  const ActionIcon = s.actionIcon;

  function goToWater() {
    setSelectedBedId(bed.id);
    router.push('/(tabs)/water');
  }

  function goToDetails() {
    setSelectedBedId(bed.id);
    router.push(`/(tabs)/crops/${bed.id}`);
  }

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {bed.name}: {bed.crop}
        </Text>
        <View style={[styles.badge, { backgroundColor: `${s.hex}1a` }]}>
          <Text style={[styles.badgeText, { color: s.hex }]}>{s.label.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.labelRow}>
        <Droplets size={14} color={Colors.textMuted} />
        <Text style={styles.mutedText}>Soil Moisture (VWC)</Text>
      </View>
      <Text style={[styles.vwc, { color: s.hex }]}>{bed.vwc}%</Text>

      <RangeBar vwc={bed.vwc} trigger={bed.vwcTrigger} optMin={bed.vwcOptimalMin} optMax={bed.vwcOptimalMax} color={s.hex} />

      <View style={styles.optimalRow}>
        <Text style={styles.mutedText}>
          {bed.crop} optimal: {bed.vwcOptimalMin}% - {bed.vwcOptimalMax}%
        </Text>
        <Text style={styles.mutedText}>Trigger: &lt; {bed.vwcTrigger}%</Text>
      </View>

      <View style={styles.messageRow}>
        <Icon size={14} color={s.hex} />
        <Text style={[styles.messageText, { color: s.hex }]}>{s.message}</Text>
      </View>

      <Pressable
        onPress={goToWater}
        style={[
          styles.actionButton,
          s.filled ? { backgroundColor: s.hex } : { borderWidth: 1.5, borderColor: s.hex },
        ]}>
        <ActionIcon size={15} color={s.filled ? Colors.textOnPrimary : s.hex} />
        <Text style={[styles.actionText, { color: s.filled ? Colors.textOnPrimary : s.hex }]}>{s.actionLabel}</Text>
      </Pressable>

      <Pressable onPress={goToDetails}>
        <Text style={styles.viewDetails}>View Details →</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  title: { fontSize: FontSize.heading, fontFamily: FontFamily.bold, color: Colors.text, flexShrink: 1 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontFamily: FontFamily.bold },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  mutedText: { fontSize: FontSize.caption, color: Colors.textMuted },
  vwc: { fontSize: 30, fontFamily: FontFamily.bold, marginTop: 2 },
  rangeWrap: { marginTop: Spacing.md, paddingTop: 20 },
  pin: { position: 'absolute', top: 0, marginLeft: -9 },
  barTrack: { flexDirection: 'row', height: 10, borderRadius: Radius.full, overflow: 'hidden', marginTop: Spacing.md },
  barEndsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  barEndText: { fontSize: 10, color: Colors.textMuted },
  barTicksRow: { position: 'relative', height: 14 },
  barTick: { position: 'absolute', marginLeft: -10, fontSize: 10, color: Colors.textMuted },
  optimalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  messageText: { fontSize: FontSize.caption, fontFamily: FontFamily.semibold },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  actionText: { fontSize: FontSize.body, fontFamily: FontFamily.bold },
  viewDetails: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bold,
    color: Colors.primaryDark,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
