import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UserProfile } from '@/types';

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (email: string, _password: string) => Promise<void>;
  logout: () => void;
}

// No auth backend exists yet — mock session, matching the mobile spec's
// "Use a mock authentication system" instruction. Swap `login` for a real
// call (and the JWT storage it implies) once one exists.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: async (email: string) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        set({
          isAuthenticated: true,
          user: { name: email.split('@')[0] || 'Farmer', email },
        });
      },
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: 'goho-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
