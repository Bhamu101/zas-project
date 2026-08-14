import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, MapPin, Droplets, Wind } from "lucide-react";
import { GLASS_CARD } from "../../lib/glass";
import { useLiveWeather } from "../../hooks/useLiveWeather";

const iconMap = {
  sunny: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-muted">
        <Icon size={12} /> {label}
      </span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function DayPanel({ label, Icon, iconColor, temp, high, low, condition, humidityPct, precipitationProbabilityPct, windKph }) {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-center gap-3 mb-3">
        <Icon size={40} className={`${iconColor} shrink-0`} />
        <div className="min-w-0">
          {temp != null ? (
            <p className="text-3xl font-bold text-ink leading-none">{temp}&deg;C</p>
          ) : (
            <p className="text-lg font-bold text-ink leading-none">{high}&deg; / {low}&deg;</p>
          )}
          <p className="text-xs text-muted mt-1 truncate">{condition}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <DetailRow icon={Droplets} label="Humidity" value={humidityPct != null ? `${humidityPct}%` : "–"} />
        <DetailRow icon={CloudRain} label="Rain Chance" value={precipitationProbabilityPct != null ? `${precipitationProbabilityPct}%` : "–"} />
        <DetailRow icon={Wind} label="Wind Speed" value={`${windKph} km/h`} />
      </div>
    </div>
  );
}

export default function WeatherToday() {
  const { loading, error, weather } = useLiveWeather();

  if (loading) {
    return (
      <div className={`${GLASS_CARD} p-4 h-full flex items-center justify-center text-center`}>
        <p className="text-xs font-medium text-muted">Locating you for live weather&hellip;</p>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={`${GLASS_CARD} p-4 h-full flex flex-col items-center justify-center text-center gap-1`}>
        <p className="text-xs font-bold text-ink">WEATHER FORECAST</p>
        <p className="text-[11px] text-muted">
          {/denied/i.test(error || "") ? "Location access denied — enable it to see live weather." : "Couldn't load live weather right now."}
        </p>
      </div>
    );
  }

  const TodayIcon = iconMap[weather.conditionIcon] || Cloud;
  const TomorrowIcon = iconMap[weather.tomorrow.conditionIcon] || Cloud;

  return (
    <div className={`${GLASS_CARD} p-4 h-full flex flex-col`}>
      <div className="flex items-center gap-2 mb-3">
        <CloudSun size={17} className="text-brand" />
        <h3 className="text-xs font-bold text-ink">WEATHER FORECAST</h3>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4">
        <DayPanel
          label="Today"
          Icon={TodayIcon}
          iconColor="text-amber-500"
          temp={weather.temp}
          condition={weather.condition}
          humidityPct={weather.humidityPct}
          precipitationProbabilityPct={weather.precipitationProbabilityPct}
          windKph={weather.windKph}
        />
        <div className="border-l border-black/5 pl-4">
          <DayPanel
            label="Tomorrow"
            Icon={TomorrowIcon}
            iconColor="text-amber-500"
            high={weather.tomorrow.high}
            low={weather.tomorrow.low}
            condition={weather.tomorrow.condition}
            humidityPct={weather.tomorrow.humidityPct}
            precipitationProbabilityPct={weather.tomorrow.precipitationProbabilityPct}
            windKph={weather.tomorrow.windKph}
          />
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs font-medium text-ink mt-3 pt-3 border-t border-black/5">
        <MapPin size={13} className="text-brand" /> {weather.location}
      </p>
    </div>
  );
}
