import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { api } from '@/services/api';
import type { DashboardResponse } from '@/types';

const POLL_INTERVAL_MS = 15000; // matches the web dashboard's polling cadence

interface DashboardState {
  data: DashboardResponse | null;
  lastSyncedAt: number | null;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  fetchNow: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

let pollHandle: ReturnType<typeof setInterval> | null = null;

// Cached to AsyncStorage so the dashboard/fields/control screens can render
// the last-known farm state immediately when offline (spec section 24),
// instead of an empty screen while a fetch is retried.
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      data: null,
      lastSyncedAt: null,
      isLoading: false,
      isOffline: false,
      error: null,

      fetchNow: async () => {
        set({ isLoading: true });
        try {
          const data = await api.getDashboard();
          set({ data, lastSyncedAt: Date.now(), isOffline: false, error: null, isLoading: false });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Failed to reach the farm backend';
          set({ isOffline: true, error: message, isLoading: false });
        }
      },

      startPolling: () => {
        if (pollHandle) return;
        get().fetchNow();
        pollHandle = setInterval(() => get().fetchNow(), POLL_INTERVAL_MS);
      },

      stopPolling: () => {
        if (pollHandle) {
          clearInterval(pollHandle);
          pollHandle = null;
        }
      },
    }),
    {
      name: 'goho-dashboard-cache',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ data: state.data, lastSyncedAt: state.lastSyncedAt }),
    }
  )
);
