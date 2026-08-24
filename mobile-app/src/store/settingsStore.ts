import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  // Runtime override for the backend URL, so the app can point at a LAN IP, an
  // ngrok/cloudflare tunnel, or a deployed host without a rebuild — needed to
  // demo/test the app from a phone that isn't on the same network as the
  // backend. Empty string means "use EXPO_PUBLIC_API_URL from .env".
  apiBaseUrlOverride: string;
  notificationsEnabled: boolean;
  language: 'en' | 'sn' | 'nd';
  setApiBaseUrlOverride: (url: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setLanguage: (language: 'en' | 'sn' | 'nd') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiBaseUrlOverride: '',
      notificationsEnabled: true,
      language: 'en',
      setApiBaseUrlOverride: (url) => set({ apiBaseUrlOverride: url.trim() }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'goho-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
