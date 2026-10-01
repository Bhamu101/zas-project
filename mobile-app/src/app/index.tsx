import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { FontFamily, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

// Simple brand splash: institutional lockup at the top, botanical mark, wordmark,
// one action. Deep green ground throughout.
//
// BOTH LOGOS ARE DARK-GROUND VARIANTS, generated rather than tinted at runtime.
// Both keep their full colour — only the ink that is the same hue as the ground
// was lifted:
//
// * telone-goho-rakangwara-ondark.png — the colour lockup, same as the web
//   dashboard's login panel uses, with ONLY its dark-green ink (the "Goho
//   Rakangwara" wordmark and the tree's circuit traces) recoloured to lime.
//   Blue "TelOne", the red strapline and the leaf gradients are untouched. On
//   this green those dark-green elements vanished; everything else already read.
//   Sits straight on the gradient with nothing behind it.
//
// * agri-logo-mark-ondark.png — the leaf mark with its dark circuit traces
//   recoloured to brand lime. The traces measured 1.02:1 against this green and
//   were invisible; a glow used to compensate. With the traces recoloured the
//   glow is unnecessary, so it has been removed.

const LOCKUP_START = 150;
const LOCKUP_DURATION = 600;
const MARK_START = 380;
const MARK_DURATION = 700;
const TITLE_START = 780;
const TITLE_DURATION = 600;
const TAGLINE_START = 1000;
const TAGLINE_DURATION = 560;
const ACTIONS_START = 1240;
const ACTIONS_DURATION = 500;
// Hold after the last element settles, so the brand sequence is read rather
// than flashed past. The lockup leads this comfortably now that it opens the
// sequence instead of closing it.
const REDIRECT_AT = ACTIONS_START + ACTIONS_DURATION + 900;

const EASE = Easing.out(Easing.cubic);

export default function SplashScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { width } = useWindowDimensions();
  const markWidth = Math.min(width * 0.52, 220);
  const lockupWidth = Math.min(width * 0.8, 330);

  const [lockupFade] = useState(() => new Animated.Value(0));
  const [markFade] = useState(() => new Animated.Value(0));
  const [markScale] = useState(() => new Animated.Value(0.88));
  const [titleFade] = useState(() => new Animated.Value(0));
  const [titleY] = useState(() => new Animated.Value(14));
  const [taglineFade] = useState(() => new Animated.Value(0));
  const [actionsFade] = useState(() => new Animated.Value(0));
  const [actionsY] = useState(() => new Animated.Value(16));

  // The splash is always the first thing shown, even on a hard refresh with an
  // already-authenticated session. The auth check happens once, after the brand
  // sequence plays out (read fresh from the store at fire time, not a captured
  // value, so this timer never needs to restart the animation).
  useEffect(() => {
    Animated.parallel([
      Animated.timing(lockupFade, { toValue: 1, duration: LOCKUP_DURATION, delay: LOCKUP_START, easing: EASE, useNativeDriver: true }),
      Animated.timing(markFade, { toValue: 1, duration: MARK_DURATION, delay: MARK_START, easing: EASE, useNativeDriver: true }),
      Animated.timing(markScale, { toValue: 1, duration: MARK_DURATION, delay: MARK_START, easing: EASE, useNativeDriver: true }),
      Animated.timing(titleFade, { toValue: 1, duration: TITLE_DURATION, delay: TITLE_START, easing: EASE, useNativeDriver: true }),
      Animated.timing(titleY, { toValue: 0, duration: TITLE_DURATION, delay: TITLE_START, easing: EASE, useNativeDriver: true }),
      Animated.timing(taglineFade, { toValue: 1, duration: TAGLINE_DURATION, delay: TAGLINE_START, easing: EASE, useNativeDriver: true }),
      Animated.timing(actionsFade, { toValue: 1, duration: ACTIONS_DURATION, delay: ACTIONS_START, easing: EASE, useNativeDriver: true }),
      Animated.spring(actionsY, { toValue: 0, delay: ACTIONS_START, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) {
        router.replace('/(tabs)');
      }
    }, REDIRECT_AT);
    return () => clearTimeout(t);
  }, [lockupFade, markFade, markScale, titleFade, titleY, taglineFade, actionsFade, actionsY]);

  return (
    <LinearGradient
      colors={['#15613C', '#0E4A2E', '#0A3823']}
      locations={[0, 0.55, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}>
      {/* Dark ground needs light status-bar glyphs. */}
      <StatusBar style="light" />

      <SafeAreaView style={styles.safeArea}>
        {/* Institutional lockup opens the screen. Full colour, straight on the
            gradient — no plate. */}
        <Animated.View style={[styles.lockupWrap, { opacity: lockupFade }]}>
          <Image
            source={require('@/assets/images/telone-goho-rakangwara-ondark.png')}
            // 1000x402 (~2.49:1) — height derived so it never distorts.
            style={{ width: lockupWidth, height: lockupWidth * 0.402 }}
            contentFit="contain"
            transition={0}
          />
        </Animated.View>

        <View style={styles.spacer} />

        <View style={styles.hero}>
          <Animated.View style={{ opacity: markFade, transform: [{ scale: markScale }] }}>
            <Image
              source={require('@/assets/images/agri-logo-mark-ondark.png')}
              // 648x700 (~0.926:1) — height derived so it never distorts.
              style={{ width: markWidth, height: markWidth * 1.08 }}
              contentFit="contain"
              transition={0}
            />
          </Animated.View>

          <Animated.Text
            style={[styles.title, { opacity: titleFade, transform: [{ translateY: titleY }] }]}>
            Agri-Intelligence
          </Animated.Text>

          <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
            Smart irrigation, intelligent decisions
          </Animated.Text>
        </View>

        <View style={styles.spacer} />

        {!isAuthenticated && (
          <Animated.View
            style={[styles.actions, { opacity: actionsFade, transform: [{ translateY: actionsY }] }]}>
            <PrimaryButton title="Sign In" onPress={() => router.push('/login')} />
          </Animated.View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
  spacer: { flex: 1 },

  lockupWrap: { alignItems: 'center', paddingTop: Spacing.sm },

  hero: { alignItems: 'center' },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontFamily: FontFamily.bold,
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontFamily: FontFamily.medium,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  actions: { alignSelf: 'stretch', marginBottom: Spacing.lg },
});
