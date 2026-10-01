import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { Camera, Droplets, MessageSquareText, Radio, Smartphone, type LucideIcon } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { LogoMark } from '@/components/ui/LogoMark';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useDashboardStore } from '@/store/dashboardStore';

// The five capabilities below are the project's five objectives, verbatim in
// substance from PROJECT-OBJECTIVES.md — including their real build status.
// Objective 1 genuinely is not built yet (no probes are wired; the firmware
// runs manual cycles only), so it is labelled "In development" rather than
// quietly presented as working.

type Status = 'live' | 'building';

const CAPABILITIES: {
  icon: LucideIcon;
  title: string;
  body: string;
  status: Status;
}[] = [
  {
    icon: Droplets,
    title: 'Automatic irrigation',
    body: 'Soil-moisture probes report to a controller on the farm. When a bed falls below its crop’s trigger threshold, that bed’s valve opens and the pump runs until the soil is back in range — one bed at a time, with no human involved.',
    status: 'building',
  },
  {
    icon: Smartphone,
    title: 'Irrigate from anywhere',
    body: 'Start a watering cycle for any bed from this app or the web dashboard. The controller runs the timed valve-and-pump sequence itself, so a dropped connection mid-cycle cannot leave a valve open.',
    status: 'live',
  },
  {
    icon: Radio,
    title: 'Remote monitoring',
    body: 'Moisture, temperature, humidity, water use, battery and solar generation, from wherever you are — not just on the farm’s WiFi. Includes a satellite view of the farm boundary.',
    status: 'live',
  },
  {
    icon: Camera,
    title: 'Crop health from a photo',
    body: 'Photograph a plant and get back a likely condition, a severity, a confidence score and a suggested treatment, from an AI vision model.',
    status: 'live',
  },
  {
    icon: MessageSquareText,
    title: 'Goho AI assistant',
    body: 'Ask anything about the farm or otherwise. The assistant is given a live summary of current system state, so it answers against real readings rather than guesses.',
    status: 'live',
  },
];

function StatusChip({ status }: { status: Status }) {
  const live = status === 'live';
  return (
    <View style={[styles.chip, { backgroundColor: live ? Colors.successLight : Colors.warningLight }]}>
      <Text style={[styles.chipText, { color: live ? Colors.success : Colors.warning }]}>
        {live ? 'Live' : 'In development'}
      </Text>
    </View>
  );
}

export default function AboutScreen() {
  const data = useDashboardStore((s) => s.data);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="About" subtitle="What this system does" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <LogoMark size={64} />
          <Text style={styles.heroTitle}>Agri-Intelligence</Text>
          <Text style={styles.heroTagline}>Smart irrigation for agricultural value chains</Text>
          <Text style={styles.heroBody}>
            A small farm wastes water because irrigation runs on a schedule rather than on need, and
            because nobody can see what the soil is actually doing. This system closes that gap: it
            measures each bed, waters only the bed that is dry, and puts the whole farm on your
            phone — so decisions come from readings instead of guesswork.
          </Text>
        </Card>

        <Text style={styles.sectionLabel}>What it does</Text>
        {CAPABILITIES.map(({ icon: Icon, title, body, status }) => (
          <Card key={title} style={styles.capCard}>
            <View style={styles.capHead}>
              <Icon size={20} color={Colors.primaryDark} />
              <Text style={styles.capTitle}>{title}</Text>
              <StatusChip status={status} />
            </View>
            <Text style={styles.capBody}>{body}</Text>
          </Card>
        ))}

        <Text style={styles.sectionLabel}>How it fits together</Text>
        <Card style={{ gap: Spacing.sm }}>
          <Text style={styles.flowStep}>
            <Text style={styles.flowNum}>1. </Text>
            Sensors in each bed read moisture and temperature.
          </Text>
          <Text style={styles.flowStep}>
            <Text style={styles.flowNum}>2. </Text>
            An ESP32 controller on the farm reads them and drives the pump and valves.
          </Text>
          <Text style={styles.flowStep}>
            <Text style={styles.flowNum}>3. </Text>
            A cloud backend reaches that controller through a secured tunnel and keeps the history.
          </Text>
          <Text style={styles.flowStep}>
            <Text style={styles.flowNum}>4. </Text>
            This app and the web dashboard read from that backend, so both always agree.
          </Text>
        </Card>

        <Text style={styles.sectionLabel}>Built at</Text>
        <Card style={styles.lockupCard}>
          <Image
            source={require('@/assets/images/telone-goho-rakangwara.png')}
            style={styles.lockup}
            contentFit="contain"
            transition={0}
          />
          <Text style={styles.lockupCaption}>
            Developed at the TelOne Centre for Learning, Goho Rakangwara.
          </Text>
        </Card>

        <Card style={{ gap: 2 }}>
          <Text style={styles.metaTitle}>Version</Text>
          <Text style={styles.metaRow}>App {appVersion}</Text>
          {data && <Text style={styles.metaRow}>Backend {data.systemInfo.backendVersion}</Text>}
          {data && <Text style={styles.metaRow}>Firmware {data.systemInfo.firmwareVersion}</Text>}
          {data && (
            <Text style={styles.metaRow}>
              {data.systemInfo.espNodes} controller node{data.systemInfo.espNodes === 1 ? '' : 's'}
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, paddingTop: 0, gap: Spacing.sm, paddingBottom: Spacing.huge },

  hero: { alignItems: 'center', gap: Spacing.sm },
  heroTitle: { fontSize: FontSize.heading, fontFamily: FontFamily.bold, color: Colors.text, marginTop: Spacing.xs },
  heroTagline: { fontSize: FontSize.body, color: Colors.textSecondary, fontFamily: FontFamily.semibold, textAlign: 'center' },
  heroBody: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium, lineHeight: 20, textAlign: 'center', marginTop: Spacing.xs },

  sectionLabel: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },

  capCard: { gap: Spacing.sm },
  capHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  capTitle: { flex: 1, fontSize: FontSize.body, fontFamily: FontFamily.bold, color: Colors.text },
  capBody: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium, lineHeight: 19 },

  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  chipText: { fontSize: 10, fontFamily: FontFamily.bold, letterSpacing: 0.3 },

  flowStep: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium, lineHeight: 19 },
  flowNum: { fontFamily: FontFamily.bold, color: Colors.text },

  lockupCard: { alignItems: 'center', gap: Spacing.sm },
  // telone-goho-rakangwara.png is 1000x402 (~2.49:1) — height derived from that.
  lockup: { width: 230, height: 92 },
  lockupCaption: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium, textAlign: 'center' },

  metaTitle: { fontSize: FontSize.body, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: 2 },
  metaRow: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium },
});
