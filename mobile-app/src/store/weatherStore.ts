import { create } from 'zustand';

import { fetchWeather, type WeatherSnapshot } from '@/services/weather';

interface WeatherState {
  weather: WeatherSnapshot | null;
  isLoading: boolean;
  error: string | null;
  fetchNow: () => Promise<void>;
}

// Not persisted / polled — weather changes slowly, and refetching costs a
// location permission + geocode round trip. Screens call fetchNow() on mount
// if `weather` is still null.
export const useWeatherStore = create<WeatherState>((set) => ({
  weather: null,
  isLoading: false,
  error: null,
  fetchNow: async () => {
    set({ isLoading: true, error: null });
    try {
      const weather = await fetchWeather();
      set({ weather, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Could not load weather', isLoading: false });
    }
  },
}));
