import { CloudOff, Inbox, RefreshCw, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

export type LoadingVariant =
  | 'home'
  | 'crops'
  | 'cropDetail'
  | 'water'
  | 'insights'
  | 'energy'
  | 'alerts';

// --- skeleton building blocks -------------------------------------------------

function Block({ h, w = '100%', radius = Radius.lg }: { h: number; w?: DimensionValue; radius?: number }) {
  return <Skeleton width={w} height={h} radius={radius} />;
}

function Stack({ n, h }: { n: number; h: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <Block key={i} h={h} />
      ))}
    </>
  );
}

function Chips({ n, w = 78 }: { n: number; w?: number }) {
  return (
    <View style={styles.skRow}>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} width={w} height={34} radius={Radius.full} />
      ))}
    </View>
  );
}

// A faux ScreenHeader (title + subtitle) for the screens that render one.
function SkHeader() {
  return (
    <View style={{ gap: Spacing.xs, marginBottom: Spacing.xs }}>
      <Skeleton width="50%" height={22} />
      <Skeleton width="68%" height={13} />
    </View>
  );
}

function Grid({ n, h }: { n: number; h: number }) {
  return (
    <View style={styles.skGrid}>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} width="47%" height={h} radius={Radius.lg} />
      ))}
    </View>
  );
}

function SkeletonBody({ variant }: { variant: LoadingVariant }) {
  switch (variant) {
    case 'crops':
      return (
        <>
          <SkHeader />
          <Block h={56} />
          <Stack n={3} h={210} />
        </>
      );
    case 'cropDetail':
      return (
        <>
          <View style={styles.skHeaderRow}>
            <Skeleton width={40} height={40} radius={Radius.full} />
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <Skeleton width="45%" height={14} />
              <Skeleton width="30%" height={11} />
            </View>
            <Skeleton width={72} height={24} radius={Radius.full} />
          </View>
          <Block h={104} />
          <Block h={150} />
          <Block h={128} />
          <Block h={96} />
        </>
      );
    case 'water':
      return (
        <>
          <SkHeader />
          <Chips n={3} w={90} />
          <Block h={148} />
          <Grid n={4} h={78} />
          <Block h={124} />
          <Stack n={3} h={54} />
        </>
      );
    case 'insights':
      return (
        <>
          <SkHeader />
          <Chips n={2} w={104} />
          <Stack n={3} h={172} />
        </>
      );
    case 'energy':
      return (
        <>
          <SkHeader />
          <Grid n={4} h={104} />
          <Block h={184} />
          <Stack n={4} h={44} />
        </>
      );
    case 'alerts':
      return (
        <>
          <SkHeader />
          <Chips n={3} w={64} />
          <Stack n={6} h={64} />
        </>
      );
    case 'home':
    default:
      return (
        <>
          <View style={styles.skHeaderRow}>
            <Skeleton width={40} height={40} radius={Radius.full} />
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <Skeleton width="35%" height={10} />
              <Skeleton width="60%" height={14} />
            </View>
          </View>
          <Block h={130} radius={Radius.xxl} />
          <Grid n={2} h={90} />
          <Block h={80} />
          <Stack n={2} h={64} />
        </>
      );
  }
}

// `label` is only shown when explicitly meaningful (e.g. a slow-network notice)
// — skeletons read best without a generic "Loading…" caption underneath.
export function LoadingState({ label, variant = 'home' }: { label?: string; variant?: LoadingVariant }) {
  return (
    <View style={styles.skeletonScreen}>
      <SkeletonBody variant={variant} />
      {label && <Text style={styles.mutedText}>{label}</Text>}
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
          <PrimaryButton title="Retry" onPress={onRetry} icon={<RefreshCw size={18} color={Colors.primaryDark} />} />
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
  skeletonScreen: { flex: 1, padding: Spacing.xl, paddingTop: Spacing.xxl, gap: Spacing.lg },
  skHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  skRow: { flexDirection: 'row', gap: Spacing.sm },
  skGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
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
