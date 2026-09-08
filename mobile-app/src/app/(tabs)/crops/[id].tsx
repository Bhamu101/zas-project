import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Droplet, Wind, Zap } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularProgress } from '@/components/dashboard/CircularProgress';
import { bedStateLabel, bedStateTone, healthPct } from '@/components/dashboard/CropCard';
import { LineSparkline } from '@/components/dashboard/LineSparkline';
import { Card } from '@/components/ui/Card';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { getCropById } from '@/data/crops';
import { getRecommendations } from '@/services/recommendationEngine';
import { useDashboardStore } from '@/store/dashboardStore';
import { useFarmStore } from '@/store/farmStore';

export default function CropDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, fetchNow } = useDashboardStore();
  const cropId = useFarmStore((s) => s.cropId);
  const farmProfile = useFarmStore((s) => s.profile);

  if (!data && error) return <ErrorState message={error} onRetry={fetchNow} />;
  if (!data) return <LoadingState variant="cropDetail" />;

  const bed = data.beds.find((b) => String(b.id) === id);
  if (!bed) return <EmptyState title="Crop not found" message="This crop may have been removed." />;

  const crop = getCropById(cropId);
  const relatedActivity = data.bedActivity.filter((a) => a.title.includes(bed.name) || a.subtitle.includes(bed.name));
  const recommendation = getRecommendations(data.beds, data.systemInfo, null, cropId).find((r) => r.bedId === bed.id);
  const health = healthPct(bed, data.systemInfo);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerCrop}>{farmProfile?.mainCrop ?? crop.name}</Text>
          <Text style={styles.headerBed}>{bed.name}</Text>
        </View>
        <StatusBadge label={bedStateLabel(bed.state)} tone={bedStateTone(bed.state)} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.healthCard}>
          <CircularProgress percent={health} size={88} strokeWidth={9} label="Health" />
          <View style={{ flex: 1, gap: Spacing.xs }}>
            <Text style={styles.cardTitle}>Health Score</Text>
            <Text style={styles.mutedText}>
              Derived from soil moisture vs. {crop.name}&apos;s optimal range ({data.systemInfo.vwcOptimalMin}%–
              {data.systemInfo.vwcOptimalMax}%).
            </Text>
          </View>
        </Card>

        <Card style={{ gap: Spacing.md }}>
          <Text style={styles.cardTitle}>Current Conditions</Text>
          <View style={styles.statGrid}>
            <ConditionStat icon={Droplet} label="Soil moisture" value={`${bed.vwc}%`} />
            <ConditionStat icon={Zap} label="Air temp" value={`${bed.airTempC}°C`} />
            <ConditionStat icon={Wind} label="Humidity" value={`${bed.humidityPct}%`} />
          </View>
        </Card>

        <Card style={{ gap: Spacing.sm }}>
          <Text style={styles.cardTitle}>Requirements — {crop.name}</Text>
          <SummaryRow label="Minimum moisture" value={`${crop.minMoisturePct}%`} />
          <SummaryRow label="Optimal moisture" value={`${crop.optimalMinPct}%–${crop.optimalMaxPct}%`} />
          <SummaryRow label="Temperature range" value={`${crop.tempMinC}°C–${crop.tempMaxC}°C`} last />
        </Card>

        {recommendation && (
          <Card style={styles.recCard}>
            <Text style={styles.recTitle}>Recommended Action</Text>
            <Text style={styles.mutedText}>{recommendation.message}</Text>
          </Card>
        )}

        <Card>
          <Text style={styles.cardTitle}>Moisture History</Text>
          <LineSparkline data={bed.trendVwc} color={Colors.primary} width={296} height={80} />
        </Card>

        <View>
          <Text style={styles.sectionLabel}>Recent Activity</Text>
          {relatedActivity.length === 0 ? (
            <Card>
              <Text style={styles.mutedText}>No recent activity logged for this crop.</Text>
            </Card>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {relatedActivity.map((a) => (
                <Card key={a.id} style={styles.activityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle}>{a.title}</Text>
                    <Text style={styles.mutedText}>{a.subtitle}</Text>
                  </View>
                  <Text style={styles.mutedText}>{a.time}</Text>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ConditionStat({ icon: Icon, label, value }: { icon: typeof Droplet; label: string; value: string }) {
  return (
    <View style={styles.conditionStat}>
      <Icon size={16} color={Colors.primaryDark} />
      <Text style={styles.conditionValue}>{value}</Text>
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.summaryRow, !last && styles.summaryRowBorder]}>
      <Text style={styles.mutedText}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.huge },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerCrop: { color: Colors.text, fontSize: FontSize.subtitle, fontFamily: FontFamily.bold },
  headerBed: { color: Colors.textSecondary, fontSize: FontSize.caption, fontFamily: FontFamily.medium },
  healthCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  cardTitle: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: Spacing.xs },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  conditionStat: { gap: 2, minWidth: 100 },
  conditionValue: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text, marginTop: 2 },
  mutedText: { fontSize: FontSize.caption, color: Colors.textSecondary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryValue: { fontSize: FontSize.body, fontFamily: FontFamily.semibold, color: Colors.text },
  recCard: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md, gap: Spacing.xs },
  recTitle: { fontSize: FontSize.body, fontFamily: FontFamily.bold, color: Colors.primaryDark },
  sectionLabel: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: Spacing.sm },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  activityTitle: { fontSize: FontSize.body, fontFamily: FontFamily.semibold, color: Colors.text },
});
