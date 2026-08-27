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

const DEFAULT_PROFILE: FarmProfile = {
  farmName: 'My Farm',
  location: 'Norton, Zimbabwe',
  farmSizeHectares: '—',
  mainCrop: 'Rape / Covo',
  irrigationType: 'Drip / Solenoid Valve',
};

export const useFarmStore = create<FarmState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      cropId: DEFAULT_CROP_ID,
      isSetupComplete: true,
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
