import { router } from 'expo-router';
import { Database, Droplets, Gauge, Leaf, Timer } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { SimpleBarChart } from '@/components/dashboard/SimpleBarChart';
import { Card } from '@/components/ui/Card';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useDashboardStore } from '@/store/dashboardStore';
import type { BedState } from '@/types';

// Season report. Everything here is derived from the dashboard payload the app
// already polls — no new endpoint — so it can never disagree with the figures
// shown on Home.

const STATE_LABEL: Record<BedState, string> = {
  optimal: 'Optimal',
  'needs-water': 'Needs water',
  critical: 'Critical',
};

const STATE_COLOR: Record<BedState, string> = {
  optimal: Colors.success,
  'needs-water': Colors.warning,
  critical: Colors.critical,
};

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const { data, error, fetchNow, lastSyncedAt } = useDashboardStore();

  if (!data && error) return <ErrorState message={error} onRetry={fetchNow} />;
  if (!data) return <LoadingState variant="energy" />;

  const { beds, irrigationOverview, extendedStats, kpis, mobileExtras, energyOverview } = data;

  const totalWaterUsed = beds.reduce((sum, b) => sum + b.waterUsedL, 0);
  const totalRunMinutes = beds.reduce((sum, b) => sum + b.durationMin, 0);
  const avgVwc = beds.length
    ? Math.round(beds.reduce((sum, b) => sum + b.vwc, 0) / beds.length)
    : 0;
  const thirstiest = beds.length
    ? beds.reduce((a, b) => (b.waterUsedL > a.waterUsedL ? b : a))
    : null;

  const syncedLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'not yet synced';

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Reports" subtitle={`Last synced ${syncedLabel}`} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metricGrid}>
          <MetricCard
            icon={Droplets}
            label="Water Used"
            value={`${irrigationOverview.todayWaterUseL.toLocaleString()} L`}
            status="Today"
            tone="info"
          />
          <MetricCard
            icon={Timer}
            label="Irrigation Runs"
            value={`${irrigationOverview.irrigationEventsCount}`}
            status={irrigationOverview.totalIrrigationTimeLabel}
            tone="neutral"
          />
          <MetricCard
            icon={Gauge}
            label="Efficiency"
            value={`${irrigationOverview.efficiencyScorePct}%`}
            status={extendedStats.systemEfficiencyLabel}
            tone={irrigationOverview.efficiencyScorePct >= 75 ? 'success' : 'warning'}
          />
          <MetricCard
            icon={Leaf}
            label="Crop Health"
            value={`${extendedStats.cropHealthScorePct}%`}
            status={extendedStats.cropHealthLabel}
            tone={extendedStats.cropHealthScorePct >= 70 ? 'success' : 'warning'}
          />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Water Use This Week (L)</Text>
          <SimpleBarChart
            labels={mobileExtras.dailyUsageLabels}
            values={mobileExtras.dailyUsageSeriesL}
            color={Colors.primary}
            height={140}
          />
          <View style={styles.divider} />
          <Row label="Week total" value={`${mobileExtras.weeklyUsageL.toLocaleString()} L`} />
          <Row
            label="vs yesterday"
            value={`${irrigationOverview.todayWaterUseDeltaPct > 0 ? '+' : ''}${irrigationOverview.todayWaterUseDeltaPct}%`}
            tone={irrigationOverview.todayWaterUseDeltaPct <= 0 ? Colors.success : Colors.warning}
          />
          <Row
            label="Estimated saving"
            value={`${mobileExtras.estimatedWaterSavingPct}%`}
            tone={Colors.success}
          />
          <Row
            label={`Saved ${extendedStats.totalWaterSavedPeriod}`}
            value={`${extendedStats.totalWaterSavedL.toLocaleString()} L`}
            tone={Colors.success}
          />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Per Bed</Text>
          {beds.map((bed, i) => (
            <View key={bed.id} style={[styles.bedRow, i < beds.length - 1 && styles.bedRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bedName}>{bed.name}</Text>
                <Text style={styles.bedCrop}>{bed.crop}</Text>
              </View>
              <View style={styles.bedFigures}>
                <Text style={styles.bedWater}>{bed.waterUsedL.toLocaleString()} L</Text>
                <Text style={styles.bedMeta}>
                  {bed.vwc}% · {bed.durationMin} min
                </Text>
              </View>
              <Text style={[styles.bedState, { color: STATE_COLOR[bed.state] }]}>
                {STATE_LABEL[bed.state]}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <Row label="Total across beds" value={`${totalWaterUsed.toLocaleString()} L`} />
          <Row label="Total run time" value={`${totalRunMinutes} min`} />
          <Row label="Average moisture" value={`${avgVwc}%`} />
          {thirstiest && <Row label="Highest use" value={thirstiest.name} />}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Energy</Text>
          <Row
            label="Solar generated today"
            value={`${extendedStats.energyGeneratedKwhToday} kWh`}
          />
          <Row
            label="Farm consumption today"
            value={`${energyOverview.powerConsumption.totalKwhToday} kWh`}
          />
          <Row label="Peak draw" value={`${energyOverview.powerConsumption.peakKw} kW`} />
          <Row label="Average draw" value={`${energyOverview.powerConsumption.avgKw} kW`} />
          <Row label="Active source" value={energyOverview.activeSource.label} />
          <Row
            label="Battery"
            value={`${kpis.batteryPct}%`}
            tone={kpis.batteryPct >= 50 ? Colors.success : Colors.warning}
          />
        </Card>

        <Pressable onPress={() => router.push('/(tabs)/more/export')}>
          <Card style={styles.exportCta}>
            <Database size={20} color={Colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.exportTitle}>Export this data</Text>
              <Text style={styles.exportSubtitle}>Download any of it as a CSV file</Text>
            </View>
          </Card>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, paddingTop: 0, gap: Spacing.md, paddingBottom: Spacing.huge },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },

  cardTitle: {
    fontSize: FontSize.subtitle,
    fontFamily: FontFamily.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  rowLabel: { flex: 1, fontSize: FontSize.body, color: Colors.textSecondary, fontFamily: FontFamily.medium },
  rowValue: { fontSize: FontSize.body, color: Colors.text, fontFamily: FontFamily.bold },

  bedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  bedRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  bedName: { fontSize: FontSize.body, fontFamily: FontFamily.bold, color: Colors.text },
  bedCrop: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium },
  bedFigures: { alignItems: 'flex-end' },
  bedWater: { fontSize: FontSize.body, fontFamily: FontFamily.bold, color: Colors.text },
  bedMeta: { fontSize: FontSize.caption, color: Colors.textMuted, fontFamily: FontFamily.medium },
  bedState: { fontSize: FontSize.caption, fontFamily: FontFamily.bold, width: 78, textAlign: 'right' },

  exportCta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  exportTitle: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  exportSubtitle: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium, marginTop: 2 },
});
