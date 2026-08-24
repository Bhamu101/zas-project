import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TextField } from '@/components/ui/TextField';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { CROPS, DEFAULT_CROP_ID } from '@/data/crops';
import { useFarmStore } from '@/store/farmStore';
import type { FarmProfile } from '@/types';

const IRRIGATION_TYPES = ['Drip / Solenoid Valve', 'Sprinkler', 'Centre Pivot', 'Manual'];
const STEPS = ['Farm', 'Crop', 'Complete'];

export default function FarmSetupScreen() {
  const completeSetup = useFarmStore((s) => s.completeSetup);
  const [step, setStep] = useState(0);

  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [farmSizeHectares, setFarmSizeHectares] = useState('');
  const [irrigationType, setIrrigationType] = useState(IRRIGATION_TYPES[0]);
  const [cropId, setCropId] = useState(DEFAULT_CROP_ID);

  const crop = CROPS.find((c) => c.id === cropId) ?? CROPS[0];
  const canContinueStep0 = farmName.trim().length > 0 && location.trim().length > 0;

  function handleFinish() {
    const profile: FarmProfile = {
      farmName: farmName.trim(),
      location: location.trim(),
      farmSizeHectares: farmSizeHectares.trim() || '—',
      mainCrop: crop.name,
      irrigationType,
    };
    completeSetup(profile, cropId);
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.flex}>
      <ScreenBackground />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Farm Setup</Text>
        <StepIndicator step={step} />

        {step === 0 && (
          <View style={styles.form}>
            <Text style={styles.sectionLabel}>Farm Information</Text>
            <Text style={styles.mutedText}>Set up your farm to get started.</Text>

            <TextField label="Farm Name" value={farmName} onChangeText={setFarmName} placeholder="e.g. Norton Demo Farm" />
            <TextField label="Location" value={location} onChangeText={setLocation} placeholder="e.g. Norton, Zimbabwe" />
            <TextField
              label="Farm Size (hectares)"
              value={farmSizeHectares}
              onChangeText={setFarmSizeHectares}
              placeholder="e.g. 0.5"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Irrigation Type</Text>
            <View style={styles.chipRow}>
              {IRRIGATION_TYPES.map((type) => (
                <Chip key={type} label={type} selected={irrigationType === type} onPress={() => setIrrigationType(type)} />
              ))}
            </View>

            <PrimaryButton title="Next" disabled={!canContinueStep0} onPress={() => setStep(1)} />
          </View>
        )}

        {step === 1 && (
          <View style={styles.form}>
            <Text style={styles.sectionLabel}>Main Crop</Text>
            <Text style={styles.mutedText}>Thresholds tune the irrigation advice to what you're growing.</Text>

            <View style={{ gap: Spacing.md }}>
              {CROPS.map((c) => (
                <Pressable key={c.id} onPress={() => setCropId(c.id)}>
                  <Card style={c.id === cropId ? styles.cropCardSelected : undefined}>
                    <View style={styles.cropCardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cropName}>{c.name}</Text>
                        <Text style={styles.mutedText}>{c.irrigationPreference}</Text>
                      </View>
                      {c.id === cropId && (
                        <View style={styles.cropCheck}>
                          <Check size={16} color={Colors.textOnPrimary} />
                        </View>
                      )}
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>

            <PrimaryButton title="Next" onPress={() => setStep(2)} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.sectionLabel}>Review &amp; Complete</Text>
            <Card>
              <SummaryRow label="Farm" value={farmName} />
              <SummaryRow label="Location" value={location} />
              <SummaryRow label="Farm size" value={farmSizeHectares ? `${farmSizeHectares} ha` : '—'} />
              <SummaryRow label="Crop" value={crop.name} />
              <SummaryRow label="Irrigation" value={irrigationType} last />
            </Card>
            <PrimaryButton title="Finish" onPress={handleFinish} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <View style={styles.stepRow}>
      {STEPS.map((label, i) => (
        <View key={label} style={styles.stepItem}>
          <View style={styles.stepPillGroup}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              {i < step ? (
                <Check size={14} color={Colors.textOnPrimary} />
              ) : (
                <Text style={[styles.stepDotText, i <= step && styles.stepDotTextActive]}>{i + 1}</Text>
              )}
            </View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
          </View>
          <Text style={styles.stepLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
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
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.huge },
  title: { fontSize: FontSize.metric, fontWeight: FontWeight.bold, color: Colors.text },
  form: { gap: Spacing.lg },
  sectionLabel: { fontSize: FontSize.heading, fontWeight: FontWeight.bold, color: Colors.text },
  label: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.text },
  mutedText: { fontSize: FontSize.body, color: Colors.textSecondary },

  stepRow: { flexDirection: 'row' },
  stepItem: { flex: 1, alignItems: 'center' },
  stepPillGroup: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotText: { fontSize: FontSize.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  stepDotTextActive: { color: Colors.textOnPrimary },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border },
  stepLineActive: { backgroundColor: Colors.primary },
  stepLabel: { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: Spacing.xs, alignSelf: 'flex-start' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.body, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  chipTextSelected: { color: Colors.primary },

  cropCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  cropCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cropName: { fontSize: FontSize.subtitle, fontWeight: FontWeight.bold, color: Colors.text },
  cropCheck: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryValue: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.text },
});
