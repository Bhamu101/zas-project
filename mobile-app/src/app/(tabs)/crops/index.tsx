import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CropCard } from '@/components/dashboard/CropCard';
import { Card } from '@/components/ui/Card';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState, OfflineBanner } from '@/components/ui/States';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useDashboardStore } from '@/store/dashboardStore';

export default function CropsScreen() {
  const { data, isLoading, isOffline, error, lastSyncedAt, fetchNow } = useDashboardStore();

  if (!data && isLoading) return <LoadingState variant="crops" />;
  if (!data && error) return <ErrorState message={error} onRetry={fetchNow} />;
  // Never render nothing: with no data, no error and no in-flight request this
  // used to paint a blank screen. Show the skeleton, as every other tab does.
  if (!data) return <LoadingState variant="crops" />;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Crops" subtitle="How healthy are my crops?" />
      {isOffline && <OfflineBanner lastSyncedAt={lastSyncedAt} />}
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.push('/(tabs)/crops/health')}>
          <Card style={styles.ctaCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Diagnose a Plant</Text>
              <Text style={styles.ctaSubtitle}>AI-powered disease & pest detection from a photo</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </Card>
        </Pressable>

        {data.beds.map((bed) => (
          <CropCard key={bed.id} bed={bed} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.huge },
  ctaCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ctaTitle: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  ctaSubtitle: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium, marginTop: 2 },
});
