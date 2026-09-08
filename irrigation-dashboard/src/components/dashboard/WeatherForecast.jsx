import { Cloud, CloudSun, CloudRain, Sun } from "lucide-react";
import { GLASS_CARD } from "../../lib/glass";

const iconMap = { sunny: Sun, "partly-cloudy": CloudSun, rain: CloudRain, cloudy: Cloud };

export default function WeatherForecast({ weather }) {
  return (
    <div className={`${GLASS_CARD} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <CloudSun size={18} className="text-brand" />
        <h3 className="text-sm font-bold text-[var(--color-ink)]">WEATHER FORECAST</h3>
      </div>

      <div className="flex items-center gap-4 pb-3 border-b border-black/5">
        <CloudSun size={36} className="text-amber-500" />
        <div>
          <p className="text-2xl font-bold text-[var(--color-ink)] leading-none">{weather.current.temp}&deg;C</p>
          <p className="text-sm text-[var(--color-muted)] mt-1">{weather.current.condition}</p>
        </div>
        <p className="ml-auto text-xs text-[var(--color-muted)]">
          Min: {weather.current.min}&deg;C &nbsp; Max: {weather.current.max}&deg;C
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 pt-3">
        {weather.forecast.map((d) => {
          const Icon = iconMap[d.condition] || Cloud;
          return (
            <div key={d.day} className="text-center">
              <p className="text-xs font-bold text-[var(--color-muted)] mb-1.5">{d.day}</p>
              <Icon size={20} className="mx-auto text-amber-500" />
              <p className="text-sm font-semibold text-[var(--color-ink)] mt-1.5">{d.high}&deg;C</p>
              <p className="text-xs text-[var(--color-muted)]">{d.low}&deg;C</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}