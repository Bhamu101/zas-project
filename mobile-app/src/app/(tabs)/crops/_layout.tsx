import { Stack } from 'expo-router';

// Same fix as more/_layout.tsx: absorbs fields/[id] so it doesn't surface as
// its own tab-bar entry.
export default function FieldsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
