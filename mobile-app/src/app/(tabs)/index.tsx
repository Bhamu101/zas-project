import { router } from 'expo-router';
import { Bell, Cloud, CloudLightning, CloudRain, CloudSun, MapPin, Sun, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularProgress } from '@/components/dashboard/CircularProgress';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ErrorState, LastSyncedLabel, LoadingState, OfflineBanner } from '@/components/ui/States';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAlertsSeenStore } from '@/store/alertsSeenStore';
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

function bedStateColor(bed: Bed): string {
  if (bed.state === 'optimal') return Colors.success;
  if (bed.state === 'needs-water') return '#f59e0b';
  return Colors.critical;
}

const WEATHER_ICONS: Record<string, typeof Sun> = {
  sunny: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  storm: CloudLightning,
};

export default function HomeScreen() {
  const farmProfile = useFarmStore((s) => s.profile);
  const { data, isLoading, isOffline, error, lastSyncedAt, fetchNow, startPolling, stopPolling } =
    useDashboardStore();
  const { weather, fetchNow: fetchWeather } = useWeatherStore();
  const seenIds = useAlertsSeenStore((s) => s.seenIds);
  const [slowLoad, setSlowLoad] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [startPolling, stopPolling]);

  useEffect(() => {
    if (!weather) fetchWeather();
  }, [weather, fetchWeather]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setSlowLoad(false);
      return;
    }
    // The backend sleeps after inactivity (Render free tier) and can take
    // ~30-60s to wake on the first request, so the plain spinner looks frozen.
    const t = setTimeout(() => setSlowLoad(true), 5000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (!data && isLoading) {
    return (
      <LoadingState
        variant="home"
        label={slowLoad ? 'Waking up your farm’s server… this can take up to a minute' : undefined}
      />
    );
  }
  if (!data && error) return <ErrorState message={error} onRetry={fetchNow} />;
  if (!data) return null;

  const criticalBed = data.beds.find((b) => b.state === 'critical') ?? data.beds[0];
  const unseenAlertsCount = data.alerts.filter((a) => !seenIds.includes(a.id)).length;
  const WeatherIcon = WEATHER_ICONS[weather?.conditionIcon ?? ''] ?? CloudSun;
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' });
  const timeLabel = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

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
          <Pressable onPress={() => router.push('/(tabs)/more/alerts')} hitSlop={8} style={styles.bellButton}>
            <Bell size={18} color={Colors.text} />
            {unseenAlertsCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unseenAlertsCount > 9 ? '9+' : unseenAlertsCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {isOffline && <OfflineBanner lastSyncedAt={lastSyncedAt} />}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTemp}>{weather ? `${weather.temp}°` : '—'}</Text>
            <WeatherIcon size={44} color={weather?.conditionIcon === 'sunny' ? '#F59E0B' : Colors.primaryDark} />
          </View>

          <View style={styles.heroLocationRow}>
            <MapPin size={14} color={Colors.textMuted} />
            <Text style={styles.heroLocation}>{farmProfile?.location ?? weather?.location ?? 'Your field'}</Text>
          </View>

          <View style={styles.heroBottomRow}>
            <View>
              <Text style={styles.heroCondition}>{weather?.condition ?? 'Fetching weather…'}</Text>
              {weather && (
                <Text style={styles.heroHiLo}>
                  ↑{weather.high}° / ↓{weather.low}°
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.heroDate}>{dateLabel}</Text>
              <Text style={styles.heroTime}>{timeLabel}</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.section} onPress={() => router.push('/(tabs)/crops')}>
          <Text style={styles.cardTitle}>Soil Moisture by Bed</Text>
          <View style={styles.ringsRow}>
            {data.beds.map((bed) => (
              <View key={bed.id} style={styles.ringItem}>
                <CircularProgress
                  percent={bed.vwc}
                  size={76}
                  strokeWidth={7}
                  color={bedStateColor(bed)}
                  trackColor={Colors.border}
                />
                <Text style={styles.ringLabel} numberOfLines={1}>
                  {bed.name}
                </Text>
                <Text style={styles.ringSub} numberOfLines={1}>
                  {bed.crop}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.cardTitle}>Farm Insight</Text>
          <Text style={styles.insightText}>{data.farmerAdvisory.message}</Text>
          <Pressable onPress={() => router.push('/(tabs)/insights')}>
            <Text style={styles.seeAll}>See all insights →</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Your Crops</Text>
            <Pressable onPress={() => router.push('/(tabs)/crops')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <View>
            {data.beds.map((bed, i) => (
              <Pressable
                key={bed.id}
                style={[styles.cropRow, i > 0 && styles.cropRowDivider]}
                onPress={() => router.push(`/(tabs)/crops/${bed.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cropName}>{bed.name}</Text>
                  <Text style={styles.mutedText}>Last irrigation: {bed.lastIrrigation}</Text>
                </View>
                <View style={[styles.cropPill, { backgroundColor: `${tonePillColor(bedTone(bed))}1A` }]}>
                  <Text style={[styles.cropPillText, { color: tonePillColor(bedTone(bed)) }]}>{bed.vwc}%</Text>
                </View>
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
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.critical,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  bellBadgeText: { color: Colors.textOnPrimary, fontSize: 10, fontFamily: FontFamily.bold },
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTemp: { color: Colors.text, fontSize: 48, fontFamily: FontFamily.bold },
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  heroLocation: { color: Colors.textSecondary, fontSize: FontSize.subtitle, fontFamily: FontFamily.medium },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  heroCondition: { color: Colors.text, fontSize: FontSize.body, fontFamily: FontFamily.semibold },
  heroHiLo: { color: Colors.textSecondary, fontSize: FontSize.caption, fontFamily: FontFamily.medium, marginTop: 2 },
  heroDate: { color: Colors.text, fontSize: FontSize.body, fontFamily: FontFamily.semibold },
  heroTime: { color: Colors.text, fontSize: 28, fontFamily: FontFamily.bold },
  section: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  ringsRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: Spacing.md },
  ringItem: { flex: 1, alignItems: 'center', gap: 2 },
  ringLabel: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bold,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  ringSub: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  cardTitle: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: Spacing.xs },
  insightText: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  seeAll: { fontSize: FontSize.caption, fontFamily: FontFamily.semibold, color: Colors.primaryDark },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionLabel: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  cropRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  cropRowDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  cropName: { fontSize: FontSize.body, fontFamily: FontFamily.semibold, color: Colors.text },
  mutedText: { fontSize: FontSize.caption, color: Colors.textSecondary },
  cropPill: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  cropPillText: { fontSize: FontSize.body, fontFamily: FontFamily.bold },
});
