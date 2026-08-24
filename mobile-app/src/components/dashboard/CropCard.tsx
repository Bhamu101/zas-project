import { LinearGradient } from 'expo-linear-gradient';
import { Droplet, Leaf, Thermometer } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CircularProgress } from '@/components/dashboard/CircularProgress';
import { Card } from '@/components/ui/Card';
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import type { Bed, SystemInfo } from '@/types';

export function bedStateTone(state: Bed['state']): BadgeTone {
  if (state === 'optimal') return 'success';
  if (state === 'needs-water') return 'warning';
  return 'critical';
}

export function bedStateLabel(state: Bed['state']): string {
  if (state === 'optimal') return 'Healthy';
  if (state === 'needs-water') return 'Needs water';
  return 'Critical';
}

// Derived, not fabricated: a 0-100 health proxy from the bed's real VWC
// reading relative to its real optimal band (systemInfo), so it moves with
// actual sensor data instead of being invented per-crop metadata.
export function healthPct(bed: Bed, systemInfo: SystemInfo): number {
  return Math.max(5, Math.min(100, Math.round((bed.vwc / systemInfo.vwcOptimalMax) * 100)));
}

export function CropCard({
  bed,
  cropName,
  systemInfo,
  onPress,
}: {
  bed: Bed;
  cropName: string;
  systemInfo: SystemInfo;
  onPress: () => void;
}) {
  const health = healthPct(bed, systemInfo);

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <LinearGradient colors={[Colors.deep, '#2C5F45']} style={styles.photo}>
          <Leaf size={28} color="rgba(255,255,255,0.35)" />
          <View style={styles.photoBadge}>
            <StatusBadge label={bedStateLabel(bed.state)} tone={bedStateTone(bed.state)} />
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cropName}>{cropName}</Text>
            <Text style={styles.mutedText}>{bed.name}</Text>

            <View style={styles.statRow}>
              <Stat icon={Droplet} value={`${bed.vwc}%`} label="Moisture" />
              <Stat icon={Thermometer} value={`${bed.soilTempC}°C`} label="Soil temp" />
            </View>
            <Text style={styles.mutedText}>Last irrigation: {bed.lastIrrigation}</Text>
          </View>

          <CircularProgress percent={health} size={64} strokeWidth={6} label="Health" />
        </View>
      </Card>
    </Pressable>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Droplet; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Icon size={13} color={Colors.textSecondary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  photo: { height: 90, padding: Spacing.md, justifyContent: 'space-between' },
  photoBadge: { alignSelf: 'flex-start' },
  body: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  cropName: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  mutedText: { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: Spacing.lg, marginVertical: Spacing.sm },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: FontSize.caption, fontFamily: FontFamily.bold, color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textMuted },
});
