import { CloudRain, Droplet, MapPin, Wind } from 'lucide-react-native';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useWeatherStore } from '@/store/weatherStore';

export default function WeatherScreen() {
  const { weather, isLoading, error, fetchNow } = useWeatherStore();

  useEffect(() => {
    if (!weather) fetchNow();
  }, [weather, fetchNow]);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Weather Forecast" />

      {!weather && isLoading && <LoadingState label="Finding your farm's forecast…" />}
      {!weather && error && <ErrorState message={error} onRetry={fetchNow} />}

      {weather && (
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.currentCard}>
            <View style={styles.locationRow}>
              <MapPin size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.location}>{weather.location}</Text>
            </View>
            <Text style={styles.temp}>{weather.temp}°C</Text>
            <Text style={styles.condition}>{weather.condition}</Text>
            <View style={styles.currentStatsRow}>
              <CurrentStat icon={Droplet} value={`${weather.humidityPct}%`} label="Humidity" />
              <CurrentStat icon={Wind} value={`${weather.windKph} km/h`} label="Wind" />
              <CurrentStat
                icon={CloudRain}
                value={weather.precipitationProbabilityPct != null ? `${weather.precipitationProbabilityPct}%` : '—'}
                label="Rain chance"
              />
            </View>
          </Card>

          <View>
            <Text style={styles.sectionLabel}>7-Day Forecast</Text>
            <View style={{ gap: Spacing.sm }}>
              {weather.daily.map((day) => (
                <Card key={day.dayLabel + day.high} style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                  <Text style={styles.dayCondition}>{day.conditionLabel}</Text>
                  <Text style={styles.dayRain}>{day.precipitationMm} mm</Text>
                  <Text style={styles.dayTemp}>
                    {day.high}° <Text style={styles.dayTempLow}>{day.low}°</Text>
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <PrimaryButton title="Refresh" variant="outline" onPress={fetchNow} loading={isLoading} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function CurrentStat({ icon: Icon, value, label }: { icon: typeof Droplet; value: string; label: string }) {
  return (
    <View style={styles.currentStat}>
      <Icon size={16} color="rgba(255,255,255,0.9)" />
      <Text style={styles.currentStatValue}>{value}</Text>
      <Text style={styles.currentStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  currentCard: { backgroundColor: Colors.info, borderColor: Colors.info, alignItems: 'center', paddingVertical: Spacing.xl },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  location: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  temp: { color: Colors.textOnPrimary, fontSize: FontSize.metricLarge + 12, fontWeight: FontWeight.bold },
  condition: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.subtitle, marginBottom: Spacing.lg },
  currentStatsRow: { flexDirection: 'row', gap: Spacing.xxl },
  currentStat: { alignItems: 'center', gap: 2 },
  currentStatValue: { color: Colors.textOnPrimary, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  currentStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.caption },
  sectionLabel: { fontSize: FontSize.subtitle, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dayLabel: { width: 56, fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.text },
  dayCondition: { flex: 1, fontSize: FontSize.caption, color: Colors.textSecondary },
  dayRain: { fontSize: FontSize.caption, color: Colors.info, width: 56 },
  dayTemp: { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.text },
  dayTempLow: { color: Colors.textMuted, fontWeight: FontWeight.regular },
});
