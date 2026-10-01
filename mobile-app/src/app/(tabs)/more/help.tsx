import * as WebBrowser from 'expo-web-browser';
import { ChevronDown, ChevronRight, Mail, MessageCircle, RefreshCw, Wifi } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { notify } from '@/lib/alert';
import { useDashboardStore } from '@/store/dashboardStore';

// Support content is written against what this system actually does — the
// troubleshooting answers describe the real failure modes (a sleeping Render
// backend, an unreachable ESP32, a stale cached snapshot) rather than generic
// filler.

const SUPPORT_EMAIL = 'support@gohorakangwara.co.zw';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Why does the first screen take up to a minute to load?',
    a: 'The farm backend is hosted on a free tier that puts the server to sleep after a period of inactivity. The first request of the day wakes it, which can take 30–60 seconds. Everything after that is fast. The app shows a "waking up" message rather than a frozen spinner while this happens.',
  },
  {
    q: 'What does the moisture percentage mean?',
    a: 'It is volumetric water content (VWC) — the share of the soil volume that is water. Each bed is judged against its own crop’s optimal band, not one shared number, because a reading that is fine for one crop is dry for another. Below the trigger threshold the system irrigates that bed.',
  },
  {
    q: 'I pressed irrigate and nothing happened.',
    a: 'The command travels from the app to the backend and then to the ESP32 controller on the farm. If the controller is powered down or off the network the backend reports a failure instead of showing a false "irrigating" state — so an error here means the command genuinely did not reach the hardware. Check that the controller has power and network, then try again.',
  },
  {
    q: 'The app says it is offline but my phone has signal.',
    a: 'That banner means the app could not reach the farm backend, not that your phone is offline. It keeps showing the last synced readings so the screens stay useful, with the time of that snapshot in the banner. If it persists, check the backend address under Settings.',
  },
  {
    q: 'Why do only some beds respond to irrigation?',
    a: 'Bed 1 is wired to real hardware — a valve and pump driven by an ESP32 relay. The remaining beds are currently simulated in the backend, so they respond in the app without moving water.',
  },
  {
    q: 'How accurate is the plant diagnosis?',
    a: 'It is an AI vision model reading one photograph, and it returns a confidence score with every diagnosis. Treat it as a first opinion that points you at a likely problem, not as a substitute for inspecting the plant. Clear, well-lit, close-up photos of the affected area give markedly better results.',
  },
];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)}>
      <Card style={styles.faqCard}>
        <View style={styles.faqHead}>
          <Text style={styles.faqQ}>{q}</Text>
          {open ? (
            <ChevronDown size={18} color={Colors.textMuted} />
          ) : (
            <ChevronRight size={18} color={Colors.textMuted} />
          )}
        </View>
        {open && <Text style={styles.faqA}>{a}</Text>}
      </Card>
    </Pressable>
  );
}

export default function HelpScreen() {
  const { fetchNow, lastSyncedAt, isOffline } = useDashboardStore();

  async function openEmail() {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Agri-Intelligence support')}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      // A device with no mail client configured would otherwise fail silently.
      notify('No mail app found', `Write to us at ${SUPPORT_EMAIL}`);
      return;
    }
    Linking.openURL(url);
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Help & Support" subtitle="Answers, fixes and how to reach us" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Quick fixes</Text>

        <Pressable onPress={() => { fetchNow(); notify('Refreshing', 'Fetching the latest farm data.'); }}>
          <Card style={styles.actionRow}>
            <RefreshCw size={20} color={Colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Force a refresh</Text>
              <Text style={styles.actionSub}>
                {isOffline
                  ? 'Currently showing cached readings — try reconnecting'
                  : lastSyncedAt
                    ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                    : 'No sync yet'}
              </Text>
            </View>
          </Card>
        </Pressable>

        <Card style={styles.actionRow}>
          <Wifi size={20} color={Colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Connection problems?</Text>
            <Text style={styles.actionSub}>
              The backend address is configurable under More → Settings → Backend Server. Change it
              only if you have been given a different one.
            </Text>
          </View>
        </Card>

        <Text style={styles.sectionLabel}>Frequently asked</Text>
        {FAQS.map((f) => (
          <Faq key={f.q} q={f.q} a={f.a} />
        ))}

        <Text style={styles.sectionLabel}>Still stuck?</Text>

        <Pressable onPress={openEmail}>
          <Card style={styles.actionRow}>
            <Mail size={20} color={Colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Email support</Text>
              <Text style={styles.actionSub}>{SUPPORT_EMAIL}</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </Card>
        </Pressable>

        <Pressable
          onPress={() =>
            WebBrowser.openBrowserAsync('https://www.telone.co.zw/telone-centre-for-learning/')
          }>
          <Card style={styles.actionRow}>
            <MessageCircle size={20} color={Colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>TelOne Centre for Learning</Text>
              <Text style={styles.actionSub}>The institution behind this project</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </Card>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, paddingTop: 0, gap: Spacing.sm, paddingBottom: Spacing.huge },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  actionTitle: { fontSize: FontSize.body, fontFamily: FontFamily.bold, color: Colors.text },
  actionSub: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium, marginTop: 2, lineHeight: 17 },
  faqCard: { gap: Spacing.sm },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  faqQ: { flex: 1, fontSize: FontSize.body, fontFamily: FontFamily.semibold, color: Colors.text },
  faqA: { fontSize: FontSize.caption, color: Colors.textSecondary, fontFamily: FontFamily.medium, lineHeight: 19 },
});
