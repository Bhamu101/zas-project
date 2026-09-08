import { router } from 'expo-router';
import { ChevronRight, User, Wifi } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { confirmAction, notify } from '@/lib/alert';
import { getApiBaseUrl, api, ApiError } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useFarmStore } from '@/store/farmStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const farmProfile = useFarmStore((s) => s.profile);

  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const apiBaseUrlOverride = useSettingsStore((s) => s.apiBaseUrlOverride);
  const setApiBaseUrlOverride = useSettingsStore((s) => s.setApiBaseUrlOverride);

  const [urlInput, setUrlInput] = useState(apiBaseUrlOverride);
  const [testing, setTesting] = useState(false);

  async function handleSaveUrl() {
    setApiBaseUrlOverride(urlInput);
    setTesting(true);
    try {
      await api.getDashboard();
      notify('Connected', `Successfully reached the backend at:\n${getApiBaseUrl()}`);
    } catch (e) {
      notify(
        'Could not connect',
        `${e instanceof ApiError ? e.message : 'Unknown error'}\n\nCheck the URL and that the backend is running and reachable from this device.`
      );
    } finally {
      setTesting(false);
    }
  }

  function handleLogout() {
    confirmAction(
      'Log out',
      'Are you sure you want to log out?',
      'Log out',
      async () => {
        // Await so the session is actually cleared from SecureStore before we
        // navigate — otherwise the splash can read a stale session and bounce
        // straight back into the tabs.
        await logout();
        router.replace('/');
      },
      { destructive: true }
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={22} color={Colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name ?? 'Farmer'}</Text>
            <Text style={styles.mutedText}>{user?.email}</Text>
            {farmProfile && <Text style={styles.mutedText}>{farmProfile.farmName}</Text>}
          </View>
        </Card>

        <Section title="Farm">
          <Row label="Farm Details" value={farmProfile?.location} />
          <Row label="Crop" value={farmProfile?.mainCrop} last />
          <Row label="Irrigation Type" value={farmProfile?.irrigationType} last />
        </Section>

        <Section title="Notifications">
          <View style={styles.toggleRow}>
            <Text style={styles.rowLabel}>Push notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: Colors.primary, false: Colors.border }}
            />
          </View>
        </Section>

        <Section title="Language">
          <Row label="English" value="Active" last />
          <Text style={styles.helperText}>Shona and Ndebele are coming in a future update.</Text>
        </Section>

        <View>
          <View style={styles.sectionHeader}>
            <Wifi size={16} color={Colors.text} />
            <Text style={styles.sectionTitle}>Backend Server</Text>
          </View>
          <Card style={{ gap: Spacing.md }}>
            <Text style={styles.mutedText}>
              Point this app at your backend&apos;s URL — a LAN IP, an ngrok/tunnel URL, or a deployed host. Useful
              when testing on a phone away from the backend&apos;s network.
            </Text>
            <TextField
              label="Backend Server URL"
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="http://192.168.1.42:8021"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.currentUrl}>Currently using: {getApiBaseUrl()}</Text>
            <PrimaryButton title="Save & Test Connection" onPress={handleSaveUrl} loading={testing} />
          </Card>
        </View>

        <Section title="Support">
          <Row label="Help & Support" onPress={() => notify('Help & Support', 'Contact your system administrator for assistance.')} />
          <Row
            label="About"
            value="v1.0.0"
            last
            onPress={() => notify('Agri-Intelligence', 'Smarter decisions for a stronger harvest.')}
          />
        </Section>

        <PrimaryButton title="Sign Out" variant="danger" onPress={handleLogout} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>{children}</Card>
    </View>
  );
}

function Row({ label, value, onPress, last }: { label: string; value?: string; onPress?: () => void; last?: boolean }) {
  const content = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {onPress && <ChevronRight size={16} color={Colors.textMuted} />}
      </View>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: Radius.full, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: FontSize.subtitle, fontWeight: FontWeight.bold, color: Colors.text },
  mutedText: { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { fontSize: FontSize.body, color: Colors.text, fontWeight: FontWeight.semibold },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rowValue: { fontSize: FontSize.body, color: Colors.textSecondary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  helperText: { fontSize: FontSize.caption, color: Colors.textMuted, marginTop: Spacing.xs },
  currentUrl: { fontSize: FontSize.caption, color: Colors.textMuted },
});
