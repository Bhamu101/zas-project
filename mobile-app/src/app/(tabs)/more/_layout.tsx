import { Stack } from 'expo-router';

// Without this nested Stack, expo-router's parent <Tabs> treats every file in
// this folder (water, energy, weather, settings, alerts) as its own top-level
// tab-bar button — this Stack "absorbs" them so only more/index shows in the
// tab bar, and the rest push as stack screens within the More tab.
export default function MoreLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
