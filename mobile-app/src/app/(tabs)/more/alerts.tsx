import { CheckCircle2, Info, TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAlertsSeenStore } from '@/store/alertsSeenStore';
import { useDashboardStore } from '@/store/dashboardStore';
import type { AlertItem } from '@/types';

type Filter = 'all' | 'critical' | 'info';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'info', label: 'Info' },
];

const LEVEL_META: Record<AlertItem['level'], { icon: typeof TriangleAlert; tone: string; bg: string }> = {
  critical: { icon: TriangleAlert, tone: Colors.critical, bg: Colors.criticalLight },
  success: { icon: CheckCircle2, tone: Colors.success, bg: Colors.successLight },
  info: { icon: Info, tone: Colors.info, bg: Colors.infoLight },
};

export default function AlertsScreen() {
  const { data, fetchNow } = useDashboardStore();
  const markSeen = useAlertsSeenStore((s) => s.markSeen);
  const [filter, setFilter] = useState<Filter>('all');
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!data) fetchNow();
  }, [data, fetchNow]);

  useEffect(() => {
    if (data) markSeen(data.alerts.map((a) => a.id));
  }, [data, markSeen]);

  if (!data) return <LoadingState variant="alerts" />;

  const alerts = data.alerts.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'critical') return a.level === 'critical';
    return a.level === 'info' || a.level === 'success';
  });

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Alerts" />

      <View style={styles.filterRow}>
        {FILTERS.map(({ key, label }) => (
          <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filterChip, filter === key && styles.filterChipActive]}>
            <Text style={[styles.filterLabel, filter === key && styles.filterLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No alerts" message="You're all caught up." />}
        renderItem={({ item }) => {
          const meta = LEVEL_META[item.level];
          const Icon = meta.icon;
          const isRead = readIds.has(item.id);
          return (
            <Pressable onPress={() => setReadIds((prev) => new Set(prev).add(item.id))}>
              <Card style={[styles.alertCard, isRead && styles.alertCardRead]}>
                <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                  <Icon size={18} color={meta.tone} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertText}>{item.text}</Text>
                  <Text style={styles.alertMeta}>
                    {item.category} · {item.time}
                  </Text>
                </View>
                {!isRead && <View style={styles.unreadDot} />}
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterLabel: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  filterLabelActive: { color: Colors.primaryDark },
  list: { padding: Spacing.xl, paddingTop: 0, paddingBottom: Spacing.huge, gap: Spacing.sm },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  alertCardRead: { opacity: 0.55 },
  iconWrap: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  alertText: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.text },
  alertMeta: { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.info },
});
