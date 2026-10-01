import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// Supabase Auth (GoTrue). The app never talks to our FastAPI backend for
// credentials — it signs in here, gets a short-lived (1h) access token plus a
// refresh token, and sends the access token as a bearer to our API, which
// verifies it against this project's public JWKS. So no password ever reaches
// our backend and our backend holds no token-minting secret.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Surfaced loudly in dev rather than failing with a confusing network error
  // on the first sign-in attempt.
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set — ' +
      'copy mobile-app/.env.example to mobile-app/.env. Sign-in will fail until they are.'
  );
}

// Tokens live in the OS keystore (iOS Keychain / Android EncryptedSharedPreferences),
// NOT AsyncStorage — AsyncStorage is plaintext on disk and readable from a rooted
// device or a filesystem backup. SecureStore has a ~2048-byte per-value limit,
// which a Supabase session comfortably fits under.
//
// SecureStore has no web implementation, so the web build falls back to
// AsyncStorage (localStorage under the hood) — acceptable there because the
// browser's own origin isolation is the boundary, and web is a dev convenience
// for this project rather than a shipping target.
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// `web.output: "static"` means Expo server-renders the web routes in Node,
// where there is no `window` — and AsyncStorage-on-web is localStorage under
// the hood. Supabase touches storage during client construction, so without
// this guard the *dev server itself* crashes with "window is not defined"
// before a single route renders. There's no session to restore during SSR
// anyway, so a no-op adapter is the correct behaviour, not just a silencer.
const noopStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

const webStorage = typeof window === 'undefined' ? noopStorage : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Native apps have no URL to parse a session out of; leaving this on causes
    // a spurious lookup on every launch.
    detectSessionInUrl: false,
  },
});
