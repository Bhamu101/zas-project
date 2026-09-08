import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Tracks which alert ids the farmer has already opened the Alerts screen for,
// so Home's notification bell can badge only genuinely new ones instead of
// re-counting the same static alerts every launch.
interface AlertsSeenState {
  seenIds: number[];
  markSeen: (ids: number[]) => void;
}

export const useAlertsSeenStore = create<AlertsSeenState>()(
  persist(
    (set, get) => ({
      seenIds: [],
      markSeen: (ids) => {
        const merged = new Set([...get().seenIds, ...ids]);
        set({ seenIds: Array.from(merged) });
      },
    }),
    {
      name: 'goho-alerts-seen',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
