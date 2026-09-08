import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  AlertTriangle,
  Bug,
  Camera,
  CheckCircle2,
  ChevronLeft,
  HelpCircle,
  Image as ImageIcon,
  Leaf,
  Sparkles,
} from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { notify } from '@/lib/alert';
import { ApiError, api } from '@/services/api';
import { useFarmStore } from '@/store/farmStore';
import type { CropDiagnosis, CropHealthStatus } from '@/types';

const STATUS_META: Record<
  CropHealthStatus,
  { label: string; tone: BadgeTone; icon: typeof Leaf }
> = {
  healthy: { label: 'Healthy', tone: 'success', icon: CheckCircle2 },
  diseased: { label: 'Disease detected', tone: 'critical', icon: AlertTriangle },
  pest: { label: 'Pest detected', tone: 'critical', icon: Bug },
  nutrient_deficiency: { label: 'Nutrient deficiency', tone: 'warning', icon: AlertTriangle },
  unclear: { label: 'Unclear', tone: 'neutral', icon: HelpCircle },
};

type Picked = { uri: string; base64: string; mimeType: string };

export default function CropHealthScreen() {
  const cropName = useFarmStore((s) => s.profile?.mainCrop);

  const [picked, setPicked] = useState<Picked | null>(null);
  const [diagnosis, setDiagnosis] = useState<CropDiagnosis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickFrom(source: 'camera' | 'library') {
    setError(null);
    setDiagnosis(null);

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify(
        'Permission needed',
        source === 'camera'
          ? 'Camera access is needed to photograph a plant.'
          : 'Photo library access is needed to choose an image.'
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets[0]?.base64) return;

    const asset = result.assets[0];
    setPicked({
      uri: asset.uri,
      base64: asset.base64!,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  }

  async function analyze() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const { diagnosis } = await api.diagnoseCropHealth(picked.base64, picked.mimeType, cropName);
      setDiagnosis(diagnosis);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong analyzing the photo.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPicked(null);
    setDiagnosis(null);
    setError(null);
  }

  const statusMeta = diagnosis ? STATUS_META[diagnosis.healthStatus] : null;
  const StatusIcon = statusMeta?.icon ?? Leaf;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Crop Health AI</Text>
          <Text style={styles.headerSubtitle}>Photograph a plant for an instant diagnosis</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!picked && (
          <Card style={styles.pickCard}>
            <View style={styles.pickIconWrap}>
              <Sparkles size={28} color={Colors.primaryDark} />
            </View>
            <Text style={styles.pickTitle}>Diagnose a plant</Text>
            <Text style={styles.pickBody}>
              Take a clear photo of a leaf or plant showing any spots, discoloration, or damage. The AI
              will identify what&apos;s wrong and suggest a treatment.
            </Text>
            <PrimaryButton title="Take Photo" onPress={() => pickFrom('camera')} icon={<Camera size={18} color={Colors.primaryDark} />} />
            <View style={{ height: Spacing.sm }} />
            <PrimaryButton
              title="Choose from Gallery"
              variant="outline"
              onPress={() => pickFrom('library')}
              icon={<ImageIcon size={18} color={Colors.primaryDark} />}
            />
          </Card>
        )}

        {picked && (
          <Card style={{ gap: Spacing.md }}>
            <Image source={{ uri: picked.uri }} style={styles.preview} />
            {!diagnosis && (
              <>
                <PrimaryButton title="Analyze Photo" onPress={analyze} loading={busy} icon={<Sparkles size={18} color={Colors.primaryDark} />} />
                <PrimaryButton title="Choose a Different Photo" variant="outline" onPress={reset} disabled={busy} />
              </>
            )}
          </Card>
        )}

        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {diagnosis && statusMeta && (
          <>
            <Card style={{ gap: Spacing.md }}>
              <View style={styles.resultHeader}>
                <View style={[styles.resultIconWrap, { backgroundColor: badgeBg(statusMeta.tone) }]}>
                  <StatusIcon size={22} color={badgeFg(statusMeta.tone)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plantName}>{diagnosis.plantIdentified}</Text>
                  <Text style={styles.mutedText}>{diagnosis.confidencePct}% confidence</Text>
                </View>
                <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
              </View>

              <View style={styles.divider} />

              <Text style={styles.conditionLabel}>Condition</Text>
              <Text style={styles.conditionValue}>{diagnosis.condition}</Text>
              <Text style={styles.bodyText}>{diagnosis.description}</Text>
            </Card>

            <Card style={styles.treatmentCard}>
              <Text style={styles.treatmentTitle}>Recommended Treatment</Text>
              <Text style={styles.treatmentBody}>{diagnosis.treatment}</Text>
            </Card>

            <Card>
              <Text style={styles.conditionLabel}>Prevention</Text>
              <Text style={styles.bodyText}>{diagnosis.preventionTips}</Text>
            </Card>

            <PrimaryButton title="Diagnose Another Plant" onPress={reset} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function badgeBg(tone: BadgeTone): string {
  if (tone === 'critical') return Colors.criticalLight;
  if (tone === 'warning') return Colors.warningLight;
  if (tone === 'success') return Colors.successLight;
  return Colors.background;
}
function badgeFg(tone: BadgeTone): string {
  if (tone === 'critical') return Colors.critical;
  if (tone === 'warning') return '#B45309';
  if (tone === 'success') return Colors.primaryDark;
  return Colors.textSecondary;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.heading, fontFamily: FontFamily.bold, color: Colors.text },
  headerSubtitle: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium },
  content: { padding: Spacing.xl, paddingTop: 0, gap: Spacing.lg, paddingBottom: Spacing.huge },
  pickCard: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  pickIconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  pickTitle: { fontSize: FontSize.heading, fontFamily: FontFamily.bold, color: Colors.text },
  pickBody: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  preview: { width: '100%', aspectRatio: 1, borderRadius: Radius.lg, backgroundColor: Colors.background },
  errorCard: { backgroundColor: Colors.criticalLight, paddingHorizontal: Spacing.md },
  errorText: { color: Colors.critical, fontSize: FontSize.body, fontFamily: FontFamily.medium },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  resultIconWrap: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  plantName: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  mutedText: { fontSize: FontSize.caption, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border },
  conditionLabel: { fontSize: FontSize.caption, fontFamily: FontFamily.semibold, color: Colors.textSecondary },
  conditionValue: { fontSize: FontSize.heading, fontFamily: FontFamily.bold, color: Colors.text, marginTop: 2, marginBottom: Spacing.xs },
  bodyText: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 20 },
  treatmentCard: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md, gap: Spacing.xs },
  treatmentTitle: { fontSize: FontSize.subtitle, fontFamily: FontFamily.bold, color: Colors.primaryDark },
  treatmentBody: { fontSize: FontSize.body, color: Colors.text, lineHeight: 20 },
});
