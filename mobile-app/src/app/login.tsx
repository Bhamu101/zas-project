import { router } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
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
import { notify } from '@/lib/alert';
import { AuthError, useAuthStore } from '@/store/authStore';

type Mode = 'signIn' | 'signUp';

// Deliberately permissive — real deliverability is proven by the confirmation
// email, not by a clever regex. This only catches obvious typos before we spend
// a network round-trip on them.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MIN_PASSWORD_LENGTH = 8;

function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Include at least one letter and one number.';
  }
  return null;
}

export default function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function validate(): boolean {
    const trimmed = email.trim();
    let ok = true;

    if (!trimmed) {
      setEmailError('Enter your email address.');
      ok = false;
    } else if (!EMAIL_RE.test(trimmed)) {
      setEmailError("That doesn't look like an email address.");
      ok = false;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError('Enter your password.');
      ok = false;
    } else if (mode === 'signUp') {
      // Only enforced when creating a password — an existing account may
      // predate these rules and must still be able to sign in.
      const problem = passwordProblem(password);
      setPasswordError(problem);
      if (problem) ok = false;
    } else {
      setPasswordError(null);
    }

    return ok;
  }

  async function handleSubmit() {
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (mode === 'signUp') {
        const { needsEmailConfirmation } = await signUp(email, password);
        if (needsEmailConfirmation) {
          notify(
            'Check your email',
            `We sent a confirmation link to ${email.trim()}. Tap it to activate your account, then sign in.`
          );
          setMode('signIn');
          setPassword('');
          return;
        }
      } else {
        await signIn(email, password);
      }
      // Routed through the splash, which plays the brand reveal and then
      // forwards on to the tabs.
      router.replace('/');
    } catch (e) {
      setFormError(
        e instanceof AuthError || e instanceof Error
          ? e.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setEmailError('Enter your email address first, then tap “Forgot password?”.');
      return;
    }
    try {
      await resetPassword(trimmed);
    } catch {
      // Swallowed on purpose: reporting whether the address exists would turn
      // this into an account-enumeration oracle. Always show the same message.
    }
    notify(
      'Check your email',
      `If an account exists for ${trimmed}, we've sent a password reset link.`
    );
  }

  const isSignUp = mode === 'signUp';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.flex}>
        <ScreenBackground />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <ChevronLeft size={24} color={Colors.text} />
          </Pressable>

          <Text style={styles.title}>
            {isSignUp ? 'Create your account' : "Let's get your farm growing"}
          </Text>

          <View style={styles.form}>
            <View>
              <TextField
                label="Email address"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (emailError) setEmailError(null);
                }}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              {emailError && <Text style={styles.fieldError}>{emailError}</Text>}
            </View>

            <View>
              <TextField
                label="Password"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType={isSignUp ? 'newPassword' : 'password'}
              />
              {passwordError ? (
                <Text style={styles.fieldError}>{passwordError}</Text>
              ) : isSignUp ? (
                <Text style={styles.fieldHint}>
                  At least {MIN_PASSWORD_LENGTH} characters, with a letter and a number.
                </Text>
              ) : null}
            </View>

            {!isSignUp && (
              <View style={styles.row}>
                <Pressable style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Check size={14} color={Colors.primaryDark} />}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </Pressable>
                <Pressable onPress={handleForgotPassword}>
                  <Text style={styles.link}>Forgot password?</Text>
                </Pressable>
              </View>
            )}

            {formError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <PrimaryButton
              title={isSignUp ? 'Create Account' : 'Login'}
              onPress={handleSubmit}
              loading={submitting}
            />

            <Pressable
              style={styles.switchMode}
              onPress={() => {
                setMode(isSignUp ? 'signIn' : 'signUp');
                setFormError(null);
                setEmailError(null);
                setPasswordError(null);
              }}>
              <Text style={styles.mutedText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.link}>{isSignUp ? 'Sign in' : 'Create account'}</Text>
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
  link: { color: Colors.primaryDark, fontWeight: FontWeight.semibold },
  fieldError: { color: Colors.critical, fontSize: FontSize.caption, marginTop: Spacing.xs },
  fieldHint: { color: Colors.textMuted, fontSize: FontSize.caption, marginTop: Spacing.xs },
  formErrorBox: {
    backgroundColor: Colors.criticalLight,
    borderRadius: 12,
    padding: Spacing.md,
  },
  formErrorText: { color: Colors.critical, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  switchMode: { alignItems: 'center', marginTop: Spacing.sm },
  mutedText: { color: Colors.textSecondary, fontSize: FontSize.body },
});
