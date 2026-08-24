import * as Location from 'expo-location';

// Mirrors irrigation-dashboard/src/hooks/useLiveWeather.js (same Open-Meteo API,
// same weather-code mapping) but uses expo-location instead of browser
// geolocation — kept as a plain async function (not a hook) so both the
// Weather screen and the recommendation engine can call it.

const WEATHER_CODE_MAP: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear sky', icon: 'sunny' },
  1: { label: 'Mainly clear', icon: 'partly-cloudy' },
  2: { label: 'Partly cloudy', icon: 'partly-cloudy' },
  3: { label: 'Overcast', icon: 'cloudy' },
  45: { label: 'Fog', icon: 'cloudy' },
  48: { label: 'Fog', icon: 'cloudy' },
  51: { label: 'Light drizzle', icon: 'rain' },
  53: { label: 'Drizzle', icon: 'rain' },
  55: { label: 'Dense drizzle', icon: 'rain' },
  61: { label: 'Light rain', icon: 'rain' },
  63: { label: 'Rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain' },
  80: { label: 'Rain showers', icon: 'rain' },
  81: { label: 'Rain showers', icon: 'rain' },
  82: { label: 'Violent rain showers', icon: 'rain' },
  95: { label: 'Thunderstorm', icon: 'storm' },
  96: { label: 'Thunderstorm', icon: 'storm' },
  99: { label: 'Thunderstorm', icon: 'storm' },
};

function describeCode(code: number) {
  return WEATHER_CODE_MAP[code] ?? { label: 'Unknown', icon: 'cloudy' };
}

const FORECAST_URL = (lat: number, lon: number) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
  `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
  `&timezone=auto&forecast_days=7`;

const REVERSE_GEOCODE_URL = (lat: number, lon: number) =>
  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

export interface DailyForecast {
  dayLabel: string;
  high: number;
  low: number;
  precipitationMm: number;
  precipitationProbabilityPct: number | null;
  conditionLabel: string;
  conditionIcon: string;
}

export interface WeatherSnapshot {
  location: string;
  temp: number;
  condition: string;
  conditionIcon: string;
  humidityPct: number;
  windKph: number;
  precipitationProbabilityPct: number | null;
  high: number;
  low: number;
  daily: DailyForecast[]; // index 0 = today
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function fetchWeather(): Promise<WeatherSnapshot> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission was denied — weather needs it to find your farm.');
  }

  const position = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = position.coords;

  const [forecastRes, geoRes] = await Promise.all([
    fetch(FORECAST_URL(latitude, longitude)),
    fetch(REVERSE_GEOCODE_URL(latitude, longitude)).catch(() => null),
  ]);
  if (!forecastRes.ok) throw new Error('Weather request failed');

  const forecastJson = await forecastRes.json();
  const geoJson = geoRes?.ok ? await geoRes.json() : null;
  const location = geoJson?.city || geoJson?.locality || geoJson?.principalSubdivision || 'Your location';

  const current = describeCode(forecastJson.current.weather_code);
  const daily: DailyForecast[] = forecastJson.daily.time.map((isoDate: string, i: number) => {
    const code = describeCode(forecastJson.daily.weather_code[i]);
    const dayIndex = new Date(isoDate).getDay();
    return {
      dayLabel: i === 0 ? 'Today' : DAY_LABELS[dayIndex],
      high: Math.round(forecastJson.daily.temperature_2m_max[i]),
      low: Math.round(forecastJson.daily.temperature_2m_min[i]),
      precipitationMm: forecastJson.daily.precipitation_sum[i] ?? 0,
      precipitationProbabilityPct: forecastJson.daily.precipitation_probability_max[i] ?? null,
      conditionLabel: code.label,
      conditionIcon: code.icon,
    };
  });

  return {
    location,
    temp: Math.round(forecastJson.current.temperature_2m),
    condition: current.label,
    conditionIcon: current.icon,
    humidityPct: forecastJson.current.relative_humidity_2m,
    windKph: Math.round(forecastJson.current.wind_speed_10m),
    precipitationProbabilityPct: forecastJson.daily.precipitation_probability_max?.[0] ?? null,
    high: daily[0]?.high ?? Math.round(forecastJson.current.temperature_2m),
    low: daily[0]?.low ?? Math.round(forecastJson.current.temperature_2m),
    daily,
  };
}
