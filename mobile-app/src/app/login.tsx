import { router } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TextField } from '@/components/ui/TextField';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useFarmStore } from '@/store/farmStore';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const isSetupComplete = useFarmStore((s) => s.isSetupComplete);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(loginEmail?: string) {
    setSubmitting(true);
    try {
      await login(loginEmail ?? email ?? 'farmer@agri-intelligence.app', password);
      router.replace(isSetupComplete ? '/(tabs)' : '/farm-setup');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.flex}>
        <ScreenBackground />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <ChevronLeft size={24} color={Colors.text} />
          </Pressable>

          <Text style={styles.title}>Let's get your farm growing</Text>

          <View style={styles.form}>
            <TextField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            <View style={styles.row}>
              <Pressable style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Check size={14} color={Colors.textOnPrimary} />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert('Forgot password', 'Password reset isn’t available in this prototype yet.')
                }>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>
            </View>

            <PrimaryButton title="Login" onPress={() => handleLogin()} loading={submitting} />

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <PrimaryButton
              title="Continue with Google"
              variant="outline"
              onPress={() => handleLogin('farmer@gmail.com')}
            />
            <View style={{ height: Spacing.sm }} />
            <PrimaryButton
              title="Continue with Apple"
              variant="outline"
              onPress={() => handleLogin('farmer@icloud.com')}
            />

            <Pressable style={styles.createAccount} onPress={() => handleLogin()}>
              <Text style={styles.mutedText}>
                Don&apos;t have an account? <Text style={styles.link}>Create account</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, gap: Spacing.xl },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: FontSize.metric, fontWeight: FontWeight.bold, color: Colors.text },
  form: { gap: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rememberText: { fontSize: FontSize.body, color: Colors.textSecondary },
  link: { color: Colors.primary, fontWeight: FontWeight.semibold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: FontSize.caption },
  createAccount: { alignItems: 'center', marginTop: Spacing.sm },
  mutedText: { color: Colors.textSecondary, fontSize: FontSize.body },
});
