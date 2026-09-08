import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

// Cinematic brand-reveal splash: AGRI-INTELLIGENCE reveals letter-by-letter
// from the center outward (no plain fade), then a subtitle and a center-out
// underline, inside a light glassmorphic card matching the rest of the app.
// The abstract symbol that used to sit above the wordmark has been removed
// per request.
const WORDMARK = 'AGRI-INTELLIGENCE'.split('');
const WORDMARK_CENTER = Math.floor((WORDMARK.length - 1) / 2);
const LETTER_STAGGER_MS = 85;
const LETTER_DURATION_MS = 420;

const WORDMARK_START = 500;
const WORDMARK_END = WORDMARK_START + WORDMARK_CENTER * LETTER_STAGGER_MS + LETTER_DURATION_MS;
const SUBTITLE_START = WORDMARK_END + 150;
const SUBTITLE_DURATION = 600;
const UNDERLINE_START = SUBTITLE_START + 350;
const UNDERLINE_DURATION = 650;
const ACTIONS_START = UNDERLINE_START + UNDERLINE_DURATION + 150;
const ACTIONS_DURATION = 500;

const EASE = Easing.out(Easing.cubic);

function AnimatedWordmark() {
  const letters = useMemo(() => WORDMARK.map(() => new Animated.Value(0)), []);

  useEffect(() => {
    Animated.parallel(
      letters.map((value, i) =>
        Animated.timing(value, {
          toValue: 1,
          duration: LETTER_DURATION_MS,
          delay: WORDMARK_START + Math.abs(i - WORDMARK_CENTER) * LETTER_STAGGER_MS,
          easing: EASE,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [letters]);

  return (
    <View style={styles.wordmarkRow}>
      {WORDMARK.map((char, i) => (
        <Animated.Text
          key={`${char}-${i}`}
          style={[
            styles.brand,
            char === '-' && styles.brandHyphen,
            {
              opacity: letters[i],
              transform: [
                { translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                { scale: letters[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
              ],
            },
          ]}>
          {char}
        </Animated.Text>
      ))}
    </View>
  );
}

export default function SplashScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [subtitleFade] = useState(() => new Animated.Value(0));
  const [subtitleY] = useState(() => new Animated.Value(10));
  const [underline] = useState(() => new Animated.Value(0));
  const [actionsFade] = useState(() => new Animated.Value(0));
  const [actionsY] = useState(() => new Animated.Value(16));

  // The splash is always the first thing shown, even on a hard refresh with
  // an already-authenticated session — it no longer redirects before ever
  // rendering. The auth check happens once, after the brand sequence plays
  // out (read fresh from the store at fire time, not a captured/dependency
  // value, so this timer never needs to restart the animation).
  useEffect(() => {
    Animated.parallel([
      Animated.timing(subtitleFade, { toValue: 1, duration: SUBTITLE_DURATION, delay: SUBTITLE_START, easing: EASE, useNativeDriver: true }),
      Animated.timing(subtitleY, { toValue: 0, duration: SUBTITLE_DURATION, delay: SUBTITLE_START, easing: EASE, useNativeDriver: true }),
      Animated.timing(underline, { toValue: 1, duration: UNDERLINE_DURATION, delay: UNDERLINE_START, easing: EASE, useNativeDriver: true }),
      Animated.timing(actionsFade, { toValue: 1, duration: ACTIONS_DURATION, delay: ACTIONS_START, easing: EASE, useNativeDriver: true }),
      Animated.spring(actionsY, { toValue: 0, delay: ACTIONS_START, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) {
        router.replace('/(tabs)');
      }
    }, ACTIONS_START);
    return () => clearTimeout(t);
  }, [subtitleFade, subtitleY, underline, actionsFade, actionsY]);

  return (
    <LinearGradient
      colors={[Colors.primaryLight, Colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1 }} />

        <View style={styles.hero}>
          <AnimatedWordmark />

          <Animated.Text
            style={[styles.subtitle, { opacity: subtitleFade, transform: [{ translateY: subtitleY }] }]}>
            SMART AGRICULTURE · INTELLIGENT DECISIONS
          </Animated.Text>

          <Animated.View
            style={[styles.underline, { transform: [{ scaleX: underline }] }]}
          />
        </View>

        {!isAuthenticated && (
          <Animated.View style={{ opacity: actionsFade, transform: [{ translateY: actionsY }], marginTop: Spacing.xxl }}>
            <PrimaryButton title="Sign In" variant="outline" onPress={() => router.push('/login')} />
          </Animated.View>
        )}

        <View style={{ flex: 1 }} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  hero: { alignItems: 'center', paddingVertical: Spacing.xxl },
  wordmarkRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  brand: {
    color: Colors.primaryDark,
    fontSize: 34,
    letterSpacing: 0.5,
    fontFamily: FontFamily.serif,
  },
  brandHyphen: { color: 'rgba(15,15,15,0.45)' },
  subtitle: {
    color: 'rgba(15,15,15,0.65)',
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: FontFamily.semibold,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  underline: {
    width: 90,
    height: 1.5,
    backgroundColor: Colors.primaryDark,
    marginTop: Spacing.lg,
  },
});
