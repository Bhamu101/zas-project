import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Database,
  FileText,
  HelpCircle,
  Info,
  Languages,
  type LucideIcon,
  LogOut,
  Settings as SettingsIcon,
  Users,
  Zap,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { confirmAction, notify } from '@/lib/alert';
import { useAuthStore } from '@/store/authStore';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export default function MoreScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    confirmAction(
      'Log out',
      'Are you sure you want to log out?',
      'Log out',
      () => {
        logout();
        router.replace('/');
      },
      { destructive: true }
    );
  }

  function notReady(label: string) {
    notify(label, 'This section is being built next.');
  }

  const items: MenuItem[] = [
    { icon: FileText, label: 'Reports', onPress: () => notReady('Reports') },
    { icon: Zap, label: 'Energy Management', onPress: () => router.push('/(tabs)/more/energy') },
    { icon: Bell, label: 'Alerts', onPress: () => router.push('/(tabs)/more/alerts') },
    { icon: Users, label: 'User Management', onPress: () => notReady('User Management') },
    { icon: Database, label: 'Data Export', onPress: () => notReady('Data Export') },
    { icon: Languages, label: 'Language', onPress: () => router.push('/(tabs)/more/settings') },
    { icon: SettingsIcon, label: 'Settings', onPress: () => router.push('/(tabs)/more/settings') },
    { icon: HelpCircle, label: 'Help & Support', onPress: () => router.push('/(tabs)/more/settings') },
    { icon: Info, label: 'About', onPress: () => router.push('/(tabs)/more/settings') },
    { icon: LogOut, label: 'Logout', onPress: handleLogout, destructive: true },
  ];

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="More" subtitle={user?.email} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {items.map(({ icon: Icon, label, onPress, destructive }, i) => (
            <Pressable
              key={label}
              onPress={onPress}
              style={[styles.row, i < items.length - 1 && styles.rowBorder]}>
              <Icon size={20} color={destructive ? Colors.critical : Colors.textSecondary} />
              <Text style={[styles.rowLabel, destructive && { color: Colors.critical }]}>{label}</Text>
              {!destructive && <ChevronRight size={18} color={Colors.textMuted} />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, paddingTop: 0, paddingBottom: Spacing.huge },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { flex: 1, fontSize: FontSize.body, fontFamily: FontFamily.semibold, color: Colors.text },
});
