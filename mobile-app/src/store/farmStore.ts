import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_CROP_ID } from '@/data/crops';
import type { FarmProfile } from '@/types';

interface FarmState {
  profile: FarmProfile | null;
  cropId: string;
  isSetupComplete: boolean;
  selectedBedId: number;
  completeSetup: (profile: FarmProfile, cropId: string) => void;
  setSelectedBedId: (id: number) => void;
}

export const useFarmStore = create<FarmState>()(
  persist(
    (set) => ({
      profile: null,
      cropId: DEFAULT_CROP_ID,
      isSetupComplete: false,
      selectedBedId: 1,
      completeSetup: (profile, cropId) => set({ profile, cropId, isSetupComplete: true }),
      setSelectedBedId: (id) => set({ selectedBedId: id }),
    }),
    {
      name: 'goho-farm',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
