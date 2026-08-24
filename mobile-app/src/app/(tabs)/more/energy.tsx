import { Battery, Sun, TrendingDown, TrendingUp, Zap } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { SimpleBarChart } from '@/components/dashboard/SimpleBarChart';
import { Card } from '@/components/ui/Card';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useDashboardStore } from '@/store/dashboardStore';

export default function EnergyManagementScreen() {
  const { data, error, fetchNow } = useDashboardStore();

  if (!data && error) return <ErrorState message={error} onRetry={fetchNow} />;
  if (!data) return <LoadingState label="Loading energy data…" />;

  const { energyOverview, extendedStats, mobileExtras } = data;
  const isSolarHigh = energyOverview.activeSource.label === 'Solar' && energyOverview.solarPanel.efficiencyPct >= 85;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Energy Management" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metricGrid}>
          <MetricCard icon={Sun} label="Solar Generated" value={`${extendedStats.energyGeneratedKwhToday} kWh`} status="Today" tone="success" />
          <MetricCard icon={Battery} label="Battery" value={`${energyOverview.battery.pct}%`} status={`${energyOverview.battery.voltage}V`} tone={energyOverview.battery.pct >= 50 ? 'success' : 'warning'} />
          <MetricCard icon={Zap} label="Farm Consumption" value={`${energyOverview.powerConsumption.totalKwhToday} kWh`} status="Today" tone="neutral" />
          <MetricCard icon={Zap} label="Grid" value={mobileExtras.gridAvailable ? 'Available' : 'Unavailable'} status={energyOverview.activeSource.label} tone={mobileExtras.gridAvailable ? 'info' : 'critical'} />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Power Consumption Today (kW)</Text>
          <SimpleBarChart
            labels={energyOverview.powerConsumption.series.hours}
            values={energyOverview.powerConsumption.series.today}
            color={Colors.primary}
            height={140}
          />
        </Card>

        <View>
          <Text style={styles.sectionLabel}>Season Stats</Text>
          <View style={{ gap: Spacing.sm }}>
            {energyOverview.stats.map((stat) => {
              const isUp = stat.deltaPct >= 0;
              const goodUp = stat.goodDirection === 'up';
              const isGood = isUp === goodUp;
              return (
                <Card key={stat.label} style={styles.statRow}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <View style={styles.deltaRow}>
                      {isUp ? (
                        <TrendingUp size={12} color={isGood ? Colors.primary : Colors.critical} />
                      ) : (
                        <TrendingDown size={12} color={isGood ? Colors.primary : Colors.critical} />
                      )}
                      <Text style={[styles.deltaText, { color: isGood ? Colors.primary : Colors.critical }]}>
                        {Math.abs(stat.deltaPct)}%
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

        <Card style={styles.recCard}>
          <Text style={styles.cardTitle}>Energy Recommendation</Text>
          <Text style={styles.mutedText}>
            {isSolarHigh
              ? 'Solar production is currently high. Irrigation can be scheduled during this period to reduce grid dependence.'
              : `Active source is ${energyOverview.activeSource.label.toLowerCase()} (${energyOverview.activeSource.status.toLowerCase()}). Consider scheduling heavy irrigation cycles when solar output peaks.`}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  cardTitle: { fontSize: FontSize.subtitle, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.xs },
  sectionLabel: { fontSize: FontSize.subtitle, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: FontSize.body, color: Colors.textSecondary, flex: 1 },
  statValue: { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.text },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  deltaText: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold },
  recCard: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  mutedText: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 20 },
});
