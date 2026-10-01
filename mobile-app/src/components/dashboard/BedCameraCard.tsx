import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { Camera, Leaf } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { api } from '@/services/api';
import type { BedCameraResponse, BedHealthCheck } from '@/types';

// Photos from the ESP32-CAM on the stand (firmware/camera-node/bed1-camera/).
// Polls only while the screen is focused, so a backgrounded tab doesn't keep
// hitting the backend.

const POLL_MS = 30000;
// While waiting for a requested photo: the camera checks in every ~20 s.
const FAST_POLL_MS = 4000;
const CAPTURE_TIMEOUT_MS = 90000;

const REASON_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  requested: 'Requested',
  irrigation: 'After irrigation',
  boot: 'Camera started',
};

const HEALTH_LABEL: Record<string, string> = {
  healthy: 'Healthy',
  diseased: 'Disease',
  pest: 'Pests',
  nutrient_deficiency: 'Nutrient deficiency',
  unclear: 'Unclear',
};

function healthTone(h: BedHealthCheck): BadgeTone {
  if (h.healthStatus === 'healthy') return 'success';
  if (h.healthStatus === 'unclear') return 'neutral';
  return h.severity === 'moderate' || h.severity === 'high' ? 'critical' : 'warning';
}

// AI check of the camera photo: automatic once a day around midday
// (backend/camera.py), or on demand.
function HealthCheck({
  bedId,
  health,
  checking,
  hasFrames,
  onDone,
}: {
  bedId: number;
  health: BedHealthCheck | null;
  checking: boolean;
  hasFrames: boolean;
  onDone: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function checkNow() {
    setBusy(true);
    setErr(null);
    try {
      await api.checkBedHealth(bedId);
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'The check failed');
    } finally {
      setBusy(false);
    }
  }

  const running = busy || checking;
  const isProblem = health && !['healthy', 'unclear'].includes(health.healthStatus);

  return (
    <View style={styles.health}>
      <View style={styles.headerRow}>
        <Leaf size={16} color={Colors.success} />
        <Text style={[styles.healthTitle, { flex: 1 }]}>AI crop check</Text>
        {health && (
          <StatusBadge
            tone={healthTone(health)}
            label={health.healthStatus === 'healthy' ? 'Healthy' : health.condition || HEALTH_LABEL[health.healthStatus]}
          />
        )}
      </View>
      {health ? (
        <>
          <Text style={styles.message}>{health.description}</Text>
          {isProblem && !!health.treatment && (
            <Text style={styles.message}>
              <Text style={styles.bold}>What to do: </Text>
              {health.treatment}
            </Text>
          )}
          <Text style={styles.notice}>
            {health.trigger === 'auto' ? 'Daily check' : 'Checked on request'} · {timeAgo(health.checkedAt)}
            {health.confidencePct != null ? ` · ${health.confidencePct}% confidence` : ''}
          </Text>
        </>
      ) : (
        <Text style={styles.message}>
          The camera’s photo is checked automatically for disease, pests and nutrient problems once a day around
          midday.
        </Text>
      )}
      {!!err && <Text style={[styles.notice, { color: Colors.critical }]}>{err}</Text>}
      <PrimaryButton
        title={running ? 'Checking…' : 'Check crop health now'}
        variant="outline"
        loading={running}
        disabled={!hasFrames}
        onPress={checkNow}
        icon={<Leaf size={18} color={Colors.primaryDark} />}
      />
    </View>
  );
}

function timeAgo(iso: string): string {
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  return `${Math.floor(sec / 86400)} d ago`;
}

function formatTaken(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

export function BedCameraCard({ bedId = 1, bedName = 'Bed 1' }: { bedId?: number; bedName?: string }) {
  const [data, setData] = useState<BedCameraResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const waitingRef = useRef<{ since: number; latestId: string | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const json = await api.getBedCamera(bedId);
      setData(json);
      setError(null);

      const w = waitingRef.current;
      if (!w) return;
      const latestId = json.frames[0]?.id ?? null;
      if (latestId && latestId !== w.latestId) {
        waitingRef.current = null;
        setWaiting(false);
        setSelectedId(null);
      } else if (Date.now() - w.since > CAPTURE_TIMEOUT_MS) {
        waitingRef.current = null;
        setWaiting(false);
        setNotice(
          json.online
            ? 'The camera hasn’t sent the photo yet — it will appear here when it does.'
            : 'The camera is offline, so it can’t take a photo right now.'
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the bed camera');
    }
  }, [bedId]);

  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, waiting ? FAST_POLL_MS : POLL_MS);
      return () => clearInterval(id);
    }, [load, waiting])
  );

  async function takePhoto() {
    setNotice(null);
    try {
      await api.requestBedPhoto(bedId);
      waitingRef.current = { since: Date.now(), latestId: data?.frames[0]?.id ?? null };
      setWaiting(true);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not reach the camera');
    }
  }

  const frames = data?.frames ?? [];
  const selected = frames.find((f) => f.id === selectedId) ?? frames[0];

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{bedName} camera</Text>
          <Text style={styles.subtitle}>
            {frames[0] ? `Last photo ${timeAgo(frames[0].takenAt)}` : 'Live photos of the bed'}
          </Text>
        </View>
        {data && <StatusBadge label={data.online ? 'Online' : 'Offline'} tone={data.online ? 'success' : 'neutral'} />}
      </View>

      {!data && error ? (
        <Text style={styles.message}>{error}</Text>
      ) : !data ? (
        <Skeleton width="100%" height={220} />
      ) : !selected ? (
        <Text style={styles.message}>
          {data.online
            ? 'The camera is connected. Its first photo should arrive within a minute.'
            : 'Once the camera on the stand is powered and on WiFi, its photos of the bed will appear here.'}
        </Text>
      ) : (
        <>
          <View style={styles.photoWrap}>
            <Image
              // The signed URL's token changes when the backend re-signs, so
              // cache on the stable frame id instead of the full URL.
              source={{ uri: selected.url, cacheKey: `bedcam-${selected.id}` }}
              style={styles.photo}
              contentFit="cover"
              transition={200}
              accessibilityLabel={`${bedName}, ${formatTaken(selected.takenAt)}`}
            />
            <View style={styles.caption}>
              <Text style={styles.captionText}>{formatTaken(selected.takenAt)}</Text>
              <Text style={styles.captionText}>{REASON_LABEL[selected.reason] ?? selected.reason}</Text>
            </View>
          </View>

          {frames.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
              {frames.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => setSelectedId(f.id)}
                  style={[styles.thumbWrap, f.id === selected.id && styles.thumbActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Photo from ${formatTaken(f.takenAt)}`}
                >
                  <Image source={{ uri: f.url, cacheKey: `bedcam-${f.id}` }} style={styles.thumb} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {(waiting || notice) && (
        <Text style={styles.notice}>
          {waiting ? 'Waiting for the camera — usually under 30 seconds…' : notice}
        </Text>
      )}
      <PrimaryButton
        title={waiting ? 'Taking photo' : 'Take photo now'}
        variant="outline"
        loading={waiting}
        disabled={!data}
        onPress={takePhoto}
        icon={<Camera size={18} color={Colors.primaryDark} />}
      />
      {data && (
        <HealthCheck
          bedId={bedId}
          health={data.health}
          checking={data.healthChecking}
          hasFrames={frames.length > 0}
          onDone={load}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  title: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 2 },
  message: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 20 },
  photoWrap: { borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.border },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  captionText: { color: Colors.textOnPrimary, fontSize: FontSize.caption, fontFamily: FontFamily.semibold },
  thumbs: { gap: Spacing.sm },
  thumbWrap: { borderRadius: Radius.sm, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  thumbActive: { borderColor: Colors.primary },
  thumb: { width: 72, height: 54 },
  notice: { fontSize: FontSize.caption, color: Colors.textSecondary },
  health: { gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  healthTitle: { fontSize: FontSize.body, fontFamily: FontFamily.bold, color: Colors.text },
  bold: { fontFamily: FontFamily.bold, color: Colors.text },
});
