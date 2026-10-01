import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { Droplets, Home, Lightbulb, MoreHorizontal, Sparkles, Sprout, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadow } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStore } from '@/store/dashboardStore';

// Glass tab bar, anchored to the bottom edge rather than floating. The active
// tab gets a raised capsule behind its icon — bordered in Colors.primary (the
// same lime used by the Start Irrigation button's fill) — instead of just a
// tinted icon.
//
// Anchored means it is NOT position:absolute, so it takes its own layout space
// and screens end above it. That is why Spacing.huge dropped from 140 to a
// normal bottom padding — pages no longer have to clear an overlay.
function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
    </View>
  );
}

function TabIcon({ Icon, focused, size }: { Icon: LucideIcon; focused: boolean; size: number }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon color={focused ? Colors.primaryDark : Colors.textMuted} size={size} />
    </View>
  );
}

const BAR_HEIGHT = 64;

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isRestoring = useAuthStore((s) => s.isRestoring);
  const startPolling = useDashboardStore((s) => s.startPolling);
  const stopPolling = useDashboardStore((s) => s.stopPolling);
  const insets = useSafeAreaInsets();

  // Polling belongs to the whole signed-in area, not to the Home tab. It used
  // to start in (tabs)/index.tsx, so opening any OTHER tab first — a deep link,
  // a notification, or just the tab you were last on — left `data` null with
  // nothing ever fetching, and those screens rendered blank.
  //
  // Guarded rather than placed after the early returns below, because hooks
  // can't be called conditionally. startPolling() is idempotent (it no-ops if a
  // handle already exists), so this is safe alongside any other caller.
  useEffect(() => {
    if (isRestoring || !isAuthenticated) return;
    startPolling();
    return stopPolling;
  }, [isRestoring, isAuthenticated, startPolling, stopPolling]);

  // Auth gate for the whole signed-in area. Without this, a deep link (or a
  // session that expired while the app was backgrounded) would render the full
  // app shell against an API that answers 401 to everything.
  //
  // `isRestoring` matters: reading the session back out of SecureStore is
  // async, so redirecting on `!isAuthenticated` alone would bounce a legitimately
  // signed-in user to the login screen on every cold start.
  if (isRestoring) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // Height carries the home-indicator inset itself so the 44px capsules
        // are never squeezed on devices that have one.
        tabBarStyle: [styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }],
        tabBarItemStyle: styles.item,
        tabBarBackground: () => <TabBarBackground />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, size }) => <TabIcon Icon={Home} focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="crops"
        options={{
          title: 'Crops',
          tabBarIcon: ({ focused, size }) => <TabIcon Icon={Sprout} focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="water"
        options={{
          title: 'Water',
          tabBarIcon: ({ focused, size }) => <TabIcon Icon={Droplets} focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Goho AI',
          tabBarIcon: ({ focused, size }) => <TabIcon Icon={Sparkles} focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused, size }) => <TabIcon Icon={Lightbulb} focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused, size }) => <TabIcon Icon={MoreHorizontal} focused={focused} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: 'transparent',
    elevation: 8,
  },
  item: { paddingTop: 0, paddingBottom: 0 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    ...Shadow,
  },
});
