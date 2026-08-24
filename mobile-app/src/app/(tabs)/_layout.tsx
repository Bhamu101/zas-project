import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { CloudSun, Droplets, Home, Lightbulb, Sprout } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Colors, FontFamily, FontSize } from '@/constants/theme';

// Tab bar's own blurred-photo layer, same treatment as the web dashboard's
// Sidebar.jsx — a stronger tint than the shared page background so small
// icons/labels stay crisp against it.
const TAB_BAR_OVERSCAN = 60;

function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={{
          position: 'absolute',
          top: -TAB_BAR_OVERSCAN,
          left: -TAB_BAR_OVERSCAN,
          right: -TAB_BAR_OVERSCAN,
          bottom: -TAB_BAR_OVERSCAN,
        }}>
        <Image
          source={require('../../../assets/images/plant-bg.jpg')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={40}
        />
      </View>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface, opacity: 0.8 }]} />
      <View style={styles.barTopBorder} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryDark,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarBackground: () => <TabBarBackground />,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="crops"
        options={{ title: 'Crops', tabBarIcon: ({ color, size }) => <Sprout color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="water"
        options={{ title: 'Water', tabBarIcon: ({ color, size }) => <Droplets color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="weather"
        options={{ title: 'Weather', tabBarIcon: ({ color, size }) => <CloudSun color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: 'Insights', tabBarIcon: ({ color, size }) => <Lightbulb color={color} size={size} /> }}
      />
      {/* Settings/Energy/Alerts still live under more/ (reached from Home's
          header icons), but per the brief's 5-item nav they're hidden from
          the tab bar rather than shown as a 6th "More" tab. */}
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  barTopBorder: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  label: { fontSize: FontSize.caption, fontFamily: FontFamily.semibold },
});
