import { useState, useEffect } from "react";

const WEATHER_CODE_MAP = {
  0: { label: "Clear sky", icon: "sunny" },
  1: { label: "Mainly clear", icon: "partly-cloudy" },
  2: { label: "Partly cloudy", icon: "partly-cloudy" },
  3: { label: "Overcast", icon: "cloudy" },
  45: { label: "Fog", icon: "cloudy" },
  48: { label: "Fog", icon: "cloudy" },
  51: { label: "Light drizzle", icon: "rain" },
  53: { label: "Drizzle", icon: "rain" },
  55: { label: "Dense drizzle", icon: "rain" },
  56: { label: "Freezing drizzle", icon: "rain" },
  57: { label: "Freezing drizzle", icon: "rain" },
  61: { label: "Light rain", icon: "rain" },
  63: { label: "Rain", icon: "rain" },
  65: { label: "Heavy rain", icon: "rain" },
  66: { label: "Freezing rain", icon: "rain" },
  67: { label: "Freezing rain", icon: "rain" },
  71: { label: "Light snow", icon: "snow" },
  73: { label: "Snow", icon: "snow" },
  75: { label: "Heavy snow", icon: "snow" },
  77: { label: "Snow grains", icon: "snow" },
  80: { label: "Rain showers", icon: "rain" },
  81: { label: "Rain showers", icon: "rain" },
  82: { label: "Violent rain showers", icon: "rain" },
  85: { label: "Snow showers", icon: "snow" },
  86: { label: "Snow showers", icon: "snow" },
  95: { label: "Thunderstorm", icon: "storm" },
  96: { label: "Thunderstorm", icon: "storm" },
  99: { label: "Thunderstorm", icon: "storm" },
};

function describeCode(code) {
  return WEATHER_CODE_MAP[code] || { label: "Unknown", icon: "cloudy" };
}

const FORECAST_URL = (lat, lon) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
  `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code` +
  `&hourly=relative_humidity_2m` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
  `&timezone=auto&forecast_days=2`;

const REVERSE_GEOCODE_URL = (lat, lon) =>
  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

export function useLiveWeather() {
  const [state, setState] = useState({ loading: true, error: null, weather: null });

  useEffect(() => {
    if (!navigator.geolocation) {
      queueMicrotask(() =>
        setState({ loading: false, error: "Geolocation is not supported on this device.", weather: null })
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        try {
          const [geoRes, forecastRes] = await Promise.all([
            fetch(REVERSE_GEOCODE_URL(latitude, longitude)),
            fetch(FORECAST_URL(latitude, longitude)),
          ]);
          if (!forecastRes.ok) throw new Error("Weather request failed");

          const forecastJson = await forecastRes.json();
          const geoJson = geoRes.ok ? await geoRes.json() : null;
          const location = geoJson?.city || geoJson?.locality || geoJson?.principalSubdivision || "Your location";

          const current = describeCode(forecastJson.current.weather_code);
          const tomorrowCode = describeCode(forecastJson.daily.weather_code[1]);
          // Hourly array starts at local midnight of today; forecast_days=2 covers
          // today (indices 0-23) and tomorrow (24-47) — index 36 is tomorrow noon.
          const tomorrowHumidity = forecastJson.hourly?.relative_humidity_2m?.[36];

          setState({
            loading: false,
            error: null,
            weather: {
              location,
              temp: Math.round(forecastJson.current.temperature_2m),
              condition: current.label,
              conditionIcon: current.icon,
              humidityPct: forecastJson.current.relative_humidity_2m,
              windKph: Math.round(forecastJson.current.wind_speed_10m),
              precipitationMm: forecastJson.current.precipitation,
              precipitationProbabilityPct: forecastJson.daily.precipitation_probability_max?.[0] ?? null,
              high: Math.round(forecastJson.daily.temperature_2m_max[0]),
              low: Math.round(forecastJson.daily.temperature_2m_min[0]),
              tomorrow: {
                condition: tomorrowCode.label,
                conditionIcon: tomorrowCode.icon,
                high: Math.round(forecastJson.daily.temperature_2m_max[1]),
                low: Math.round(forecastJson.daily.temperature_2m_min[1]),
                humidityPct: tomorrowHumidity != null ? Math.round(tomorrowHumidity) : null,
                windKph: Math.round(forecastJson.daily.wind_speed_10m_max[1]),
                precipitationProbabilityPct: forecastJson.daily.precipitation_probability_max?.[1] ?? null,
              },
            },
          });
        } catch (e) {
          setState({ loading: false, error: e.message, weather: null });
        }
      },
      (err) => {
        setState({ loading: false, error: err.message || "Location access was denied.", weather: null });
      },
      { timeout: 10000 }
    );
  }, []);

  return state;
}
