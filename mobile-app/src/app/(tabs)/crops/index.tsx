import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CropCard } from '@/components/dashboard/CropCard';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState, OfflineBanner } from '@/components/ui/States';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useDashboardStore } from '@/store/dashboardStore';
import { useFarmStore } from '@/store/farmStore';

export default function CropsScreen() {
  const { data, isLoading, isOffline, error, lastSyncedAt, fetchNow } = useDashboardStore();
  const farmProfile = useFarmStore((s) => s.profile);
  const setSelectedBedId = useFarmStore((s) => s.setSelectedBedId);

  if (!data && isLoading) return <LoadingState label="Loading crops…" />;
  if (!data && error) return <ErrorState message={error} onRetry={fetchNow} />;
  if (!data) return null;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Crops" subtitle="How healthy are my crops?" />
      {isOffline && <OfflineBanner lastSyncedAt={lastSyncedAt} />}
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.push('/(tabs)/crops/health')}>
          <LinearGradient colors={[Colors.deep, '#2C5F45']} style={styles.ctaCard}>
            <View style={styles.ctaIconWrap}>
              <Sparkles size={22} color={Colors.textOnPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Diagnose a Plant</Text>
              <Text style={styles.ctaSubtitle}>AI-powered disease & pest detection from a photo</Text>
            </View>
            <ChevronRight size={20} color="rgba(255,255,255,0.85)" />
          </LinearGradient>
        </Pressable>

        {data.beds.map((bed) => (
          <CropCard
            key={bed.id}
            bed={bed}
            cropName={farmProfile?.mainCrop ?? 'Rape / Covo'}
            systemInfo={data.systemInfo}
            onPress={() => {
              setSelectedBedId(bed.id);
              router.push(`/(tabs)/crops/${bed.id}`);
            }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.huge },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  ctaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.textOnPrimary },
  ctaSubtitle: { fontSize: FontSize.caption, color: 'rgba(255,255,255,0.8)', fontFamily: FontFamily.medium, marginTop: 2 },
});
