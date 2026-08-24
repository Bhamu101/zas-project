import { Droplets, Gauge, Minus, Plus, TrendingDown } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularProgress } from '@/components/dashboard/CircularProgress';
import { SimpleBarChart } from '@/components/dashboard/SimpleBarChart';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { CROPS } from '@/data/crops';
import { getRecommendations } from '@/services/recommendationEngine';
import { ApiError, api } from '@/services/api';
import { useDashboardStore } from '@/store/dashboardStore';
import { useFarmStore } from '@/store/farmStore';

export default function WaterScreen() {
  const { data, fetchNow, error } = useDashboardStore();
  const selectedBedId = useFarmStore((s) => s.selectedBedId);
  const setSelectedBedId = useFarmStore((s) => s.setSelectedBedId);
  const cropId = useFarmStore((s) => s.cropId);

  const [duration, setDuration] = useState(30);
  const [busy, setBusy] = useState(false);

  if (!data && error) return <ErrorState message={error} onRetry={fetchNow} />;
  if (!data) return <LoadingState label="Loading water data…" />;

  const bed = data.beds.find((b) => b.id === selectedBedId) ?? data.beds[0];
  const crop = CROPS.find((c) => c.id === cropId) ?? CROPS[0];
  const recommendation = getRecommendations(data.beds, data.systemInfo, null, cropId).find(
    (r) => r.bedId === bed.id
  );
  const { kpis, extendedStats, mobileExtras } = data;

  async function handleStart() {
    Alert.alert('Start irrigation', `Run ${bed.name} for ${duration} minutes?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: async () => {
          setBusy(true);
          try {
            await api.startIrrigation(bed.id, duration);
            await fetchNow();
          } catch (e) {
            Alert.alert('Could not start irrigation', e instanceof ApiError ? e.message : 'Unknown error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function handleStop() {
    Alert.alert('Stop irrigation', `Stop the irrigation cycle for ${bed.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.stopIrrigation(bed.id);
            await fetchNow();
          } catch (e) {
            Alert.alert('Could not stop irrigation', e instanceof ApiError ? e.message : 'Unknown error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Water Management" subtitle="Does my crop need water?" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bedChipRow}>
          {data.beds.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setSelectedBedId(b.id)}
              style={[styles.bedChip, b.id === bed.id && styles.bedChipActive]}>
              <Text style={[styles.bedChipText, b.id === bed.id && styles.bedChipTextActive]}>{b.name}</Text>
            </Pressable>
          ))}
        </View>

        <Card style={styles.heroCard}>
          <CircularProgress
            percent={bed.vwc}
            size={128}
            strokeWidth={12}
            color={bed.vwc >= data.systemInfo.vwcOptimalMin ? Colors.primary : Colors.warning}
            label="Moisture"
          />
          <View style={{ flex: 1, gap: Spacing.xs }}>
            <Text style={styles.heroLabel}>Target range</Text>
            <Text style={styles.heroValue}>
              {data.systemInfo.vwcOptimalMin}%–{data.systemInfo.vwcOptimalMax}%
            </Text>
            <StatusBadge
              label={bed.irrigating ? 'Irrigating now' : bed.vwc >= data.systemInfo.vwcOptimalMin ? 'Optimal' : 'Needs water'}
              tone={bed.irrigating ? 'info' : bed.vwc >= data.systemInfo.vwcOptimalMin ? 'success' : 'warning'}
            />
          </View>
        </Card>

        {recommendation && recommendation.severity !== 'none' && (
          <Card style={styles.recCard}>
            <Text style={styles.recTitle}>Next irrigation recommendation</Text>
            <Text style={styles.mutedText}>{recommendation.message}</Text>
          </Card>
        )}

        <View style={styles.metricGrid}>
          <MiniMetric icon={Droplets} label="Water Used Today" value={`${kpis.waterUsedTodayL.toLocaleString()} L`} />
          <MiniMetric icon={TrendingDown} label="Water Saved" value={`${extendedStats.totalWaterSavedL.toLocaleString()} L`} />
          <MiniMetric icon={Gauge} label="Water Efficiency" value={`${data.irrigationOverview.efficiencyScorePct}%`} />
          <MiniMetric icon={Droplets} label="Tank Level" value={`${mobileExtras.tankLevelPct}%`} />
        </View>

        <Card style={{ gap: Spacing.lg }}>
          <Text style={styles.cardTitle}>Manual Irrigation</Text>
          <View style={styles.durationRow}>
            <Text style={styles.mutedText}>Duration</Text>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepperButton}
                disabled={bed.irrigating}
                onPress={() => setDuration((d) => Math.max(5, d - 5))}>
                <Minus size={16} color={bed.irrigating ? Colors.textMuted : Colors.text} />
              </Pressable>
              <Text style={styles.durationValue}>{bed.irrigating ? bed.durationMin : duration} min</Text>
              <Pressable
                style={styles.stepperButton}
                disabled={bed.irrigating}
                onPress={() => setDuration((d) => Math.min(120, d + 5))}>
                <Plus size={16} color={bed.irrigating ? Colors.textMuted : Colors.text} />
              </Pressable>
            </View>
          </View>
          {bed.irrigating ? (
            <PrimaryButton title="STOP" variant="danger" onPress={handleStop} loading={busy} />
          ) : (
            <PrimaryButton title="START IRRIGATION" onPress={handleStart} loading={busy} />
          )}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Daily Water Usage (L)</Text>
          <SimpleBarChart
            labels={mobileExtras.dailyUsageLabels}
            values={mobileExtras.dailyUsageSeriesL}
            color={Colors.primary}
            height={140}
          />
        </Card>

        <View>
          <Text style={styles.sectionLabel}>Irrigation History</Text>
          <View style={{ gap: Spacing.sm }}>
            {data.bedActivity.slice(0, 5).map((a) => (
              <Card key={a.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>{a.title}</Text>
                  <Text style={styles.mutedText}>{a.subtitle}</Text>
                </View>
                <Text style={styles.mutedText}>{a.time}</Text>
              </Card>
            ))}
          </View>
        </View>

        <Text style={styles.cropNote}>Thresholds tuned for {crop.name}.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof Droplets; label: string; value: string }) {
  return (
    <Card style={styles.miniMetric}>
      <Icon size={16} color={Colors.primary} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.mutedText}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  bedChipRow: { flexDirection: 'row', gap: Spacing.sm },
  bedChip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  bedChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  bedChipText: { fontSize: FontSize.body, fontFamily: FontFamily.semibold, color: Colors.textSecondary },
  bedChipTextActive: { color: Colors.primaryDark },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  heroLabel: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium },
  heroValue: { fontSize: FontSize.heading, fontFamily: FontFamily.bold, color: Colors.text },
  recCard: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary, gap: Spacing.xs },
  recTitle: { fontSize: FontSize.body, fontFamily: FontFamily.bold, color: Colors.primaryDark },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  miniMetric: { flexBasis: '47%', flexGrow: 1, gap: Spacing.xs },
  miniValue: { fontSize: FontSize.heading, fontFamily: FontFamily.bold, color: Colors.text, marginTop: Spacing.xs },
  cardTitle: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  mutedText: { fontSize: FontSize.caption, color: Colors.textSecondary },
  durationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationValue: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text, minWidth: 72, textAlign: 'center' },
  sectionLabel: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: Spacing.sm },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  historyTitle: { fontSize: FontSize.body, fontFamily: FontFamily.semibold, color: Colors.text },
  cropNote: { fontSize: FontSize.caption, color: Colors.textMuted, textAlign: 'center' },
});
