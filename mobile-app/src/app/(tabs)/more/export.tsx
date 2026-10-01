import { Bell, Database, Droplets, Sprout, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { notify } from '@/lib/alert';
import { buildCsv, deliverCsv, fileNameFor, rowCount, type ExportKind } from '@/lib/exportData';
import { useDashboardStore } from '@/store/dashboardStore';

const EXPORTS: { kind: ExportKind; icon: typeof Database; label: string; description: string }[] = [
  { kind: 'beds', icon: Sprout, label: 'Bed readings', description: 'Moisture, thresholds, temperature, pump and valve state' },
  { kind: 'water', icon: Droplets, label: 'Water use', description: 'Litres used per day across the week' },
  { kind: 'energy', icon: Zap, label: 'Energy', description: 'Hourly draw today against yesterday' },
  { kind: 'alerts', icon: Bell, label: 'Alerts', description: 'Every alert with level, category and timestamp' },
];

export default function DataExportScreen() {
  const { data, error, fetchNow, lastSyncedAt } = useDashboardStore();
  const [busy, setBusy] = useState<ExportKind | null>(null);

  if (!data && error) return <ErrorState message={error} onRetry={fetchNow} />;
  if (!data) return <LoadingState variant="energy" />;

  async function handleExport(kind: ExportKind) {
    if (!data || busy) return;
    setBusy(kind);
    try {
      const fileName = fileNameFor(kind);
      const message = await deliverCsv(fileName, buildCsv(kind, data));
      notify('Export', message);
    } catch (e) {
      notify('Export failed', e instanceof Error ? e.message : 'Could not export that data.');
    } finally {
      setBusy(null);
    }
  }

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
      <ScreenHeader title="Data Export" subtitle={`Snapshot from ${syncedLabel}`} />
      <ScrollView contentContainerStyle={styles.content}>
        {EXPORTS.map(({ kind, icon: Icon, label, description }) => {
          const rows = rowCount(kind, data!);
          const isBusy = busy === kind;
          const isEmpty = rows === 0;
          return (
            <Pressable key={kind} onPress={() => handleExport(kind)} disabled={isBusy || isEmpty}>
              <Card style={[styles.row, isEmpty && styles.rowDisabled]}>
                <Icon size={22} color={Colors.primaryDark} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.description}>{description}</Text>
                  <Text style={styles.rows}>
                    {isEmpty ? 'Nothing recorded yet' : `${rows} row${rows === 1 ? '' : 's'} · CSV`}
                  </Text>
                </View>
                {isBusy && <ActivityIndicator color={Colors.primaryDark} />}
              </Card>
            </Pressable>
          );
        })}

        <Card style={styles.note}>
          <Text style={styles.noteTitle}>What you get</Text>
          <Text style={styles.noteBody}>
            {Platform.OS === 'web'
              ? 'Each export downloads as a .csv file you can open in Excel or Google Sheets.'
              : 'Each export opens your share sheet, so the CSV can go to email, Drive or WhatsApp.'}
          </Text>
          <Text style={styles.noteBody}>
            Exports are taken from the snapshot the app last synced, so they match what the rest of
            the app is showing. Pull to refresh on Home first if you need the very latest.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, paddingTop: 0, gap: Spacing.md, paddingBottom: Spacing.huge },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowDisabled: { opacity: 0.5 },
  label: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  description: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium, marginTop: 2 },
  rows: { fontSize: FontSize.caption, color: Colors.textMuted, fontFamily: FontFamily.semibold, marginTop: 6 },
  note: { gap: Spacing.sm },
  noteTitle: { fontSize: FontSize.body, fontFamily: FontFamily.bold, color: Colors.text },
  noteBody: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium, lineHeight: 18 },
});
