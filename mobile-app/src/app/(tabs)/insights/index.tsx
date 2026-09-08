import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { Card } from '@/components/ui/Card';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { CROPS } from '@/data/crops';
import { confirmAction, notify } from '@/lib/alert';
import { ApiError, api } from '@/services/api';
import { getRecommendations } from '@/services/recommendationEngine';
import { useDashboardStore } from '@/store/dashboardStore';
import { useFarmStore } from '@/store/farmStore';
import { useWeatherStore } from '@/store/weatherStore';

type Tab = 'current' | 'guide';

export default function InsightsScreen() {
  const { data, error, fetchNow } = useDashboardStore();
  const cropId = useFarmStore((s) => s.cropId);
  const { weather, fetchNow: fetchWeather } = useWeatherStore();
  const [tab, setTab] = useState<Tab>('current');
  const [startingBedId, setStartingBedId] = useState<number | null>(null);

  useEffect(() => {
    if (!weather) fetchWeather();
  }, [weather, fetchWeather]);

  if (!data && error) return <ErrorState message={error} onRetry={fetchNow} />;
  if (!data) return <LoadingState variant="insights" />;

  const recommendations = getRecommendations(
    data.beds,
    data.systemInfo,
    weather?.precipitationProbabilityPct ?? null,
    cropId
  );

  async function handleStartNow(bedId: number, durationMin: number, bedName: string) {
    confirmAction('Start irrigation', `Run ${bedName} for ${durationMin} minutes now?`, 'Start', async () => {
      setStartingBedId(bedId);
      try {
        await api.startIrrigation(bedId, durationMin);
        await fetchNow();
      } catch (e) {
        notify('Could not start irrigation', e instanceof ApiError ? e.message : 'Unknown error');
      } finally {
        setStartingBedId(null);
      }
    });
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Insights" subtitle="What should I do next?" />

      <View style={styles.tabRow}>
        <TabButton label="Current" active={tab === 'current'} onPress={() => setTab('current')} />
        <TabButton label="Crop Guide" active={tab === 'guide'} onPress={() => setTab('guide')} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'current' ? (
          <View style={{ gap: Spacing.md }}>
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                starting={startingBedId === rec.bedId}
                onStartNow={
                  rec.severity !== 'none'
                    ? () => handleStartNow(rec.bedId, rec.suggestedDurationMin, rec.bedName)
                    : undefined
                }
              />
            ))}
          </View>
        ) : (
          <View style={{ gap: Spacing.md }}>
            {CROPS.map((crop) => (
              <Card key={crop.id} style={crop.id === cropId ? styles.cropCardActive : undefined}>
                <Text style={styles.cropName}>
                  {crop.name}
                  {crop.id === cropId ? '  ·  Your crop' : ''}
                </Text>
                <View style={styles.guideRow}>
                  <GuideStat label="Minimum" value={`${crop.minMoisturePct}%`} />
                  <GuideStat label="Optimal" value={`${crop.optimalMinPct}–${crop.optimalMaxPct}%`} />
                  <GuideStat label="Temp range" value={`${crop.tempMinC}–${crop.tempMaxC}°C`} />
                </View>
                <Text style={styles.mutedText}>{crop.irrigationPreference}</Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function GuideStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.guideValue}>{value}</Text>
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  tabButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabButtonText: { fontSize: FontSize.body, fontFamily: FontFamily.semibold, color: Colors.textSecondary },
  tabButtonTextActive: { color: Colors.primaryDark },
  content: { padding: Spacing.xl, paddingTop: 0, paddingBottom: Spacing.huge },
  cropCardActive: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md },
  cropName: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: Spacing.sm },
  guideRow: { flexDirection: 'row', gap: Spacing.xl, marginBottom: Spacing.sm },
  guideValue: { fontSize: FontSize.body, fontFamily: FontFamily.bold, color: Colors.text },
  mutedText: { fontSize: FontSize.caption, color: Colors.textSecondary },
});
