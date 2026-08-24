import { CloudOff, Inbox, RefreshCw, TriangleAlert } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.center}>
      <Inbox size={40} color={Colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.mutedText}>{message}</Text>
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <TriangleAlert size={40} color={Colors.critical} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.mutedText}>{message}</Text>
      {onRetry && (
        <View style={{ marginTop: Spacing.md, width: '100%' }}>
          <PrimaryButton title="Retry" onPress={onRetry} icon={<RefreshCw size={18} color={Colors.textOnPrimary} />} />
        </View>
      )}
    </View>
  );
}

function timeAgoLabel(timestampMs: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - timestampMs) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}

export function OfflineBanner({ lastSyncedAt }: { lastSyncedAt: number | null }) {
  return (
    <View style={styles.banner}>
      <CloudOff size={16} color="#B45309" />
      <Text style={styles.bannerText}>
        {lastSyncedAt
          ? `Offline — showing data from ${timeAgoLabel(lastSyncedAt)}`
          : 'Offline — no synchronized data yet'}
      </Text>
    </View>
  );
}

export function LastSyncedLabel({ lastSyncedAt }: { lastSyncedAt: number | null }) {
  if (!lastSyncedAt) return null;
  return <Text style={styles.syncedText}>Last synchronized: {timeAgoLabel(lastSyncedAt)}</Text>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xxl,
  },
  title: { fontSize: FontSize.heading, fontWeight: FontWeight.bold, color: Colors.text, marginTop: Spacing.xs },
  mutedText: { fontSize: FontSize.body, color: Colors.textSecondary, textAlign: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  bannerText: { color: '#B45309', fontSize: FontSize.caption, fontWeight: FontWeight.semibold, flexShrink: 1 },
  syncedText: { fontSize: FontSize.caption, color: Colors.textMuted },
});
