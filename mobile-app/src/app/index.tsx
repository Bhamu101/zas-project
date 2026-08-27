import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Droplets, Leaf, Sprout } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/ui/LogoMark';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

const BENEFITS = [
  { icon: Droplets, label: 'Save Water' },
  { icon: Sprout, label: 'Increase Yields' },
  { icon: Leaf, label: 'Sustainable Future' },
];

export default function SplashScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      setChecked(true);
    }
  }, [isAuthenticated]);

  if (!checked) return <View style={styles.container} />;

  return (
    <LinearGradient colors={[Colors.deep, '#0E2A20', '#091D16']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <LogoMark size={80} tone="dark" />
          <Text style={styles.brand}>Agri-Intelligence</Text>
          <Text style={styles.subtitle}>Smarter decisions for a stronger harvest</Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map(({ icon: Icon, label }) => (
            <View key={label} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Icon size={18} color={Colors.primary} />
              </View>
              <Text style={styles.benefitLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View>
          <PrimaryButton title="Get Started" onPress={() => router.push('/login')} />
          <View style={{ height: Spacing.sm }} />
          <PrimaryButton title="Sign In" variant="outlineLight" onPress={() => router.push('/login')} />
          <Text style={styles.footer}>Agri-Intelligence · Smart Farming Platform</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  hero: { alignItems: 'center', marginTop: Spacing.huge },
  brand: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.metricLarge,
    fontFamily: FontFamily.bold,
    marginTop: Spacing.lg,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.subtitle,
    fontFamily: FontFamily.medium,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  benefits: { gap: Spacing.md },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitLabel: { color: Colors.textOnPrimary, fontSize: FontSize.subtitle, fontFamily: FontFamily.semibold },
  footer: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.caption,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
