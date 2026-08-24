import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Droplets, Sprout, Thermometer, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { Card } from '@/components/ui/Card';
import { LogoMark } from '@/components/ui/LogoMark';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ErrorState, LastSyncedLabel, LoadingState, OfflineBanner } from '@/components/ui/States';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useDashboardStore } from '@/store/dashboardStore';
import { useFarmStore } from '@/store/farmStore';
import { useWeatherStore } from '@/store/weatherStore';
import type { Bed } from '@/types';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function bedTone(bed: Bed): 'success' | 'warning' | 'critical' {
  if (bed.state === 'optimal') return 'success';
  if (bed.state === 'needs-water') return 'warning';
  return 'critical';
}

export default function HomeScreen() {
  const farmProfile = useFarmStore((s) => s.profile);
  const { data, isLoading, isOffline, error, lastSyncedAt, fetchNow, startPolling, stopPolling } =
    useDashboardStore();
  const { weather, fetchNow: fetchWeather } = useWeatherStore();

  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [startPolling, stopPolling]);

  useEffect(() => {
    if (!weather) fetchWeather();
  }, [weather, fetchWeather]);

  if (!data && isLoading) return <LoadingState label="Loading your farm…" />;
  if (!data && error) return <ErrorState message={error} onRetry={fetchNow} />;
  if (!data) return null;

  const avgAirTemp = Math.round(
    data.beds.reduce((sum, b) => sum + b.airTempC, 0) / data.beds.length
  );
  const anyIrrigating = data.beds.some((b) => b.irrigating);
  const criticalBed = data.beds.find((b) => b.state === 'critical') ?? data.beds[0];

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.push('/(tabs)/more')} style={styles.avatar}>
            <User size={18} color={Colors.primaryDark} />
          </Pressable>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.farmName}>{farmProfile?.farmName ?? 'Your farm'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <LogoMark size={34} tone="light" />
          <Pressable onPress={() => router.push('/(tabs)/more/alerts')} hitSlop={8} style={styles.bellButton}>
            <Bell size={18} color={Colors.text} />
          </Pressable>
        </View>
      </View>

      {isOffline && <OfflineBanner lastSyncedAt={lastSyncedAt} />}

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={[Colors.deep, '#1F4D3B']} style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>{farmProfile?.location ?? 'Your field'}</Text>
            <Text style={styles.heroTemp}>{weather ? `${weather.temp}°C` : '—'}</Text>
            <Text style={styles.heroCondition}>{weather?.condition ?? 'Fetching weather…'}</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{data.systemStatus.status}</Text>
            <Text style={styles.heroBadgeMeta}>System {data.systemStatus.mode === 'AUTOMATIC' ? 'Auto' : 'Manual'}</Text>
          </View>
        </LinearGradient>

        <View style={styles.metricGrid}>
          <MetricCard
            icon={Sprout}
            label="Soil Moisture"
            value={`${data.kpis.soilMoistureAvg}%`}
            status={data.kpis.soilMoistureAvg >= 40 ? 'Optimal' : 'Low'}
            tone={data.kpis.soilMoistureAvg >= 40 ? 'success' : 'warning'}
          />
          <MetricCard icon={Thermometer} label="Temperature" value={`${avgAirTemp}°C`} status="Good" tone="success" />
          <MetricCard
            icon={Droplets}
            label="Water"
            value={data.mobileExtras.tankLevelPct >= 20 ? 'Available' : 'Low'}
            status={anyIrrigating ? 'Irrigating now' : 'Irrigation ready'}
            tone={anyIrrigating ? 'info' : 'success'}
          />
          <MetricCard
            icon={Sprout}
            label="Crop Health"
            value={`${data.extendedStats.cropHealthScorePct}%`}
            status={data.extendedStats.cropHealthLabel}
            tone="success"
          />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Farm Insight</Text>
          <Text style={styles.insightText}>{data.farmerAdvisory.message}</Text>
          <Pressable onPress={() => router.push('/(tabs)/insights')}>
            <Text style={styles.seeAll}>See all insights →</Text>
          </Pressable>
        </Card>

        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Your Crops</Text>
            <Pressable onPress={() => router.push('/(tabs)/crops')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <View style={{ gap: Spacing.sm }}>
            {data.beds.map((bed) => (
              <Pressable key={bed.id} onPress={() => router.push(`/(tabs)/crops/${bed.id}`)}>
                <Card style={styles.cropRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cropName}>{bed.name}</Text>
                    <Text style={styles.mutedText}>Last irrigation: {bed.lastIrrigation}</Text>
                  </View>
                  <View style={[styles.cropPill, { backgroundColor: `${tonePillColor(bedTone(bed))}1A` }]}>
                    <Text style={[styles.cropPillText, { color: tonePillColor(bedTone(bed)) }]}>{bed.vwc}%</Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>

        <PrimaryButton
          title={`Start Irrigation${criticalBed ? ` — ${criticalBed.name}` : ''}`}
          onPress={() => router.push('/(tabs)/water')}
        />
        <LastSyncedLabel lastSyncedAt={lastSyncedAt} />
      </ScrollView>
    </SafeAreaView>
  );
}

function tonePillColor(tone: 'success' | 'warning' | 'critical'): string {
  if (tone === 'success') return Colors.primaryDark;
  if (tone === 'warning') return '#B45309';
  return Colors.critical;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium },
  farmName: { fontSize: FontSize.subtitle, color: Colors.text, fontFamily: FontFamily.bold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  hero: {
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.caption, fontFamily: FontFamily.medium },
  heroTemp: { color: Colors.textOnPrimary, fontSize: FontSize.metricLarge, fontFamily: FontFamily.bold, marginTop: Spacing.xs },
  heroCondition: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.body, fontFamily: FontFamily.medium },
  heroBadge: { alignItems: 'flex-end' },
  heroBadgeText: { color: Colors.textOnPrimary, fontSize: FontSize.body, fontFamily: FontFamily.bold },
  heroBadgeMeta: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.caption, fontFamily: FontFamily.medium, marginTop: 2 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  cardTitle: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: Spacing.xs },
  insightText: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  seeAll: { fontSize: FontSize.caption, fontFamily: FontFamily.semibold, color: Colors.primaryDark },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionLabel: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  cropRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cropName: { fontSize: FontSize.body, fontFamily: FontFamily.semibold, color: Colors.text },
  mutedText: { fontSize: FontSize.caption, color: Colors.textSecondary },
  cropPill: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  cropPillText: { fontSize: FontSize.body, fontFamily: FontFamily.bold },
});
