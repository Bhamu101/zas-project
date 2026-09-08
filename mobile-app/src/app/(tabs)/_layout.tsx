import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { Droplets, Home, Lightbulb, MoreHorizontal, Sparkles, Sprout, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Shadow } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

// Floating glass pill tab bar. The active tab gets a raised capsule behind
// its icon — bordered in Colors.primary (the same lime used by the Start
// Irrigation button's fill) — instead of just a tinted icon.
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

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isRestoring = useAuthStore((s) => s.isRestoring);

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
        tabBarStyle: styles.bar,
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
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    height: 64,
    borderRadius: Radius.full,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
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
